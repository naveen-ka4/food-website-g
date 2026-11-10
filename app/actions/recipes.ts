"use server";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import { createNotificationInternal } from "./notifications";
import { analyzeRecipeWithAi, analyzeReviewWithAi } from "@/lib/ai/moderator";
import { runFreeContentFilter } from "@/lib/moderation/free-filter";
import { sendTelegramModerationAlert } from "@/lib/telegram/bot";

const IngredientSchema = z.object({
  name: z.string().trim().min(1, "Ingredient name is required."),
  baseAmount: z.number().nonnegative().default(1),
  unit: z.string().default(""),
  icon: z.string().default(""),
  notes: z.string().optional(),
  group: z.string().optional(),
});

const InstructionStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().trim().default(""),
  description: z.string().trim().min(1, "Instruction description is required."),
  image: z.string().default(""),
  sectionTitle: z.string().optional(),
});

const PublishRecipeSchema = z.object({
  title: z.string().trim().min(3, "Recipe title must be at least 3 characters."),
  description: z.string().trim().optional(),
  heroImage: z.string().optional(),
  category: z.string().trim().default("General"),
  mealType: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]).default("Dinner"),
  tag: z.string().default("Quick & Easy"),
  dietaryTag: z.string().optional(),
  tip: z.string().optional(),
  cookTime: z.number().int().min(1).default(20),
  prepTime: z.number().int().min(0).default(10),
  defaultServings: z.number().int().min(1).default(2),
  ingredients: z.array(IngredientSchema).min(1, "Please provide at least 1 ingredient."),
  instructions: z.array(InstructionStepSchema).min(1, "Please provide at least 1 instruction step."),
});

export type PublishRecipeInput = z.infer<typeof PublishRecipeSchema>;

export type RecipeActionResult = {
  success: boolean;
  recipeId?: string;
  slug?: string;
  message?: string;
  isLocked?: boolean;
  error?: string;
};

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || "recipe"}-${randomSuffix}`;
}

/**
 * Server Action: Save Recipe (either as Draft or Published, new or update)
 */
export async function saveRecipeAction(data: {
  id?: string;
  title: string;
  description?: string;
  heroImage?: string;
  category?: string;
  mealType?: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  cuisine?: string;
  tag?: string;
  dietaryTag?: string;
  tags?: string[];
  categories?: string[];
  tip?: string;
  cookTime?: number;
  prepTime?: number;
  defaultServings?: number;
  ingredients?: Array<{
    name: string;
    baseAmount: number;
    unit: string;
    icon: string;
    notes?: string;
    group?: string;
  }>;
  instructions?: Array<{
    stepNumber: number;
    title: string;
    description: string;
    image: string;
    sectionTitle?: string;
  }>;
  isPublished: boolean;
}): Promise<RecipeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to save or publish a recipe." };
  }

  // Check user profile for ban status, staff role, cooldown, and strikes
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("role, is_banned, cooldown_until, spam_strikes, username")
    .eq("id", user.id)
    .single();

  if (userProfile?.is_banned) {
    return { success: false, error: "Your account has been suspended from publishing content." };
  }

  // 1. Cooldown Check: If user has an active 5-hour cooldown, block submission
  if (userProfile?.cooldown_until) {
    const cooldownTime = new Date(userProfile.cooldown_until).getTime();
    const nowTime = Date.now();
    if (cooldownTime > nowTime) {
      const diffMs = cooldownTime - nowTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return {
        success: false,
        error: `Your account is currently on a 5-hour cooldown following a policy violation. Remaining: ${hours > 0 ? `${hours}h ` : ""
          }${mins}m.`,
      };
    }
  }

  // 2. Active Locked Recipe Check: If user has a recipe currently locked under review, block new submissions
  const { count: lockedCount } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "locked");

  if (lockedCount && lockedCount > 0) {
    return {
      success: false,
      error: "You currently have a recipe under security review. You cannot submit new recipes until it has been resolved by moderators.",
    };
  }

  const isStaff = userProfile?.role === "admin" || userProfile?.role === "moderator";
  let recipeStatus = isStaff ? (data.isPublished ? "approved" : "pending") : "pending";
  let recipePublished = isStaff ? data.isPublished : false;
  let reviewToken: string | null = null;

  const trimmedTitle = data.title?.trim();
  if (!trimmedTitle) {
    return { success: false, error: "Recipe title is required." };
  }

  // If publishing, require at least 1 ingredient and 1 instruction
  if (data.isPublished) {
    if (!data.ingredients || data.ingredients.length === 0) {
      return { success: false, error: "Please provide at least one ingredient to publish." };
    }
    if (!data.instructions || data.instructions.length === 0) {
      return { success: false, error: "Please provide at least one instruction step to publish." };
    }
  }

  const isExisting = Boolean(data.id && data.id !== "new");
  const slug = isExisting ? undefined : generateSlug(trimmedTitle);

  // Two-Stage Filtering Pipeline (Runs ONLY when publishing public recipes)
  let aiAnalysisResult: any = null;

  if (data.isPublished && !isStaff) {
    // Stage 1: Free Local Bad Content Filter (0ms, Zero Cost, No Tokens)
    const freeFilterRes = runFreeContentFilter({
      title: trimmedTitle,
      description: data.description,
      category: data.category,
      tag: data.tag || (data.tags && data.tags[0]),
      ingredients: data.ingredients,
      instructions: data.instructions,
      hero_image: data.heroImage || null,
    });

    if (freeFilterRes.isSevereViolation) {
      // Blatant spam, adult content, or malicious links detected by Stage 1
      // Instantly LOCK recipe without spending any AI tokens!
      recipePublished = false;
      recipeStatus = "locked";
      reviewToken = crypto.randomUUID();
      aiAnalysisResult = {
        is_safe: false,
        verdict: "flagged",
        confidence_score: 0.1,
        issues: freeFilterRes.issues,
        executive_summary: freeFilterRes.executiveSummary,
        provider: "Free Heuristic Filter",
      };
    } else {
      // Stage 2: Multimodal AI Pass (Single request: text + compressed thumbnail)
      try {
        aiAnalysisResult = await analyzeRecipeWithAi({
          title: trimmedTitle,
          description: data.description,
          category: data.category,
          meal_type: data.mealType,
          prep_time: data.prepTime,
          cook_time: data.cookTime,
          default_servings: data.defaultServings,
          ingredients: data.ingredients,
          instructions: data.instructions,
          hero_image: data.heroImage || null,
        });
      } catch (aiErr) {
        console.warn("AI analysis skipped during recipe save:", aiErr);
      }

      if (aiAnalysisResult) {
        if (aiAnalysisResult.verdict === "flagged") {
          recipePublished = false;
          recipeStatus = "locked";
          reviewToken = crypto.randomUUID();
        } else if (aiAnalysisResult.verdict === "safe" || aiAnalysisResult.verdict === "needs_info") {
          recipePublished = true;
          recipeStatus = "approved";
        }
      } else {
        // Fallback: If AI provider call failed, publish as approved
        recipePublished = true;
        recipeStatus = "approved";
      }
    }
  } else if (!data.isPublished) {
    // Private / Draft Recipe: Completely skip AI and filters (Zero Tokens, Total Privacy)
    recipePublished = false;
    recipeStatus = "pending";
  }

  let finalRecipeId = data.id;

  if (isExisting) {
    const updatePayload: Record<string, any> = {
      title: trimmedTitle,
      description: data.description?.trim() || null,
      hero_image: data.heroImage || null,
      category: data.category || "General",
      meal_type: data.mealType || "Dinner",
      tag: data.tag || (data.tags && data.tags[0]) || data.cuisine?.trim() || "Quick & Easy",
      dietary_tag: data.dietaryTag || null,
      tip: data.tip || null,
      cook_time: data.cookTime ?? 20,
      prep_time: data.prepTime ?? 10,
      default_servings: data.defaultServings ?? 2,
      ingredients: data.ingredients || [],
      instructions: data.instructions || [],
      is_published: recipePublished,
      status: recipeStatus,
      updated_at: new Date().toISOString(),
    };

    if (aiAnalysisResult) {
      updatePayload.ai_score = aiAnalysisResult.confidence_score;
      updatePayload.ai_analysis = aiAnalysisResult;
    }
    if (reviewToken) {
      updatePayload.review_token = reviewToken;
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id!);
    let updateQuery = supabase.from("recipes").update(updatePayload);
    if (isUUID) {
      updateQuery = updateQuery.eq("id", data.id!).eq("user_id", user.id);
    } else {
      updateQuery = updateQuery.eq("slug", data.id!).eq("user_id", user.id);
    }

    const { error: updateError } = await updateQuery;
    if (updateError) {
      console.error("Error updating recipe:", updateError);
      return { success: false, error: updateError.message };
    }
  } else {
    const insertPayload: Record<string, any> = {
      user_id: user.id,
      title: trimmedTitle,
      slug: slug!,
      description: data.description?.trim() || null,
      hero_image: data.heroImage || null,
      category: data.category || "General",
      meal_type: data.mealType || "Dinner",
      tag: data.tag || (data.tags && data.tags[0]) || data.cuisine?.trim() || "Quick & Easy",
      dietary_tag: data.dietaryTag || null,
      tip: data.tip || null,
      cook_time: data.cookTime ?? 20,
      prep_time: data.prepTime ?? 10,
      default_servings: data.defaultServings ?? 2,
      ingredients: data.ingredients || [],
      instructions: data.instructions || [],
      is_published: recipePublished,
      status: recipeStatus,
      ai_score: aiAnalysisResult?.confidence_score ?? 0.95,
      ai_analysis: aiAnalysisResult ?? {},
    };

    if (reviewToken) {
      insertPayload.review_token = reviewToken;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("recipes")
      .insert(insertPayload)
      .select("id, slug")
      .single();

    if (insertError) {
      console.error("Error inserting recipe:", insertError);
      return { success: false, error: insertError.message };
    }

    finalRecipeId = inserted.id;
  }

  // Post-save AI Moderation Actions (Author Missing Info Alerts & Telegram Intercepts)
  if (aiAnalysisResult && finalRecipeId) {
    const actionTaken =
      aiAnalysisResult.verdict === "flagged"
        ? "telegram_alert_sent"
        : aiAnalysisResult.verdict === "needs_info"
          ? "author_notified"
          : "auto_approved";

    // 1. Save detailed audit report
    try {
      await supabase.from("ai_moderation_reports").insert({
        entity_type: "recipe",
        entity_id: finalRecipeId,
        author_id: user.id,
        verdict: aiAnalysisResult.verdict,
        confidence_score: aiAnalysisResult.confidence_score,
        issues: aiAnalysisResult.issues || [],
        suggested_tags: aiAnalysisResult.suggested_tags || [],
        executive_summary: aiAnalysisResult.executive_summary || aiAnalysisResult.summary,
        action_taken: actionTaken,
        image_analysis: aiAnalysisResult.image_analysis || {},
        reviewed_by_channel: "ai_worker",
      });
    } catch (repErr) {
      console.warn("Could not record ai_moderation_report:", repErr);
    }

    // 2. Author In-App Notifications:
    // Case A: Safe & Complete -> Send warm "Thank you" notification!
    if (aiAnalysisResult.verdict === "safe") {
      try {
        await createNotificationInternal({
          userId: user.id,
          type: "system",
          title: "🎉 Recipe Published Successfully!",
          message: `Thank you for sharing! Your recipe "${trimmedTitle}" is now live and published for the Hey Garlic community.`,
          link: `/recipe/${slug || data.id || finalRecipeId}`,
          entityId: finalRecipeId,
        });
      } catch (notifErr) {
        console.warn("Failed to dispatch author thanks notification:", notifErr);
      }
    }

    // Case B: Friendly tip if recipe has missing details ("Info Adu")
    if (aiAnalysisResult.verdict === "needs_info") {
      const issueDetails =
        aiAnalysisResult.quality_issues?.length > 0
          ? aiAnalysisResult.quality_issues.join(", ")
          : aiAnalysisResult.issues?.join(", ") || "Missing measurement units or instructions";

      try {
        await createNotificationInternal({
          userId: user.id,
          type: "system",
          title: "Recipe Tip: Missing Details",
          message: `Your recipe "${trimmedTitle}" was saved, but lacks a few details: ${issueDetails}. Updating it will help more home cooks follow it!`,
          link: `/recipe/${slug || data.id || finalRecipeId}/edit`,
          entityId: finalRecipeId,
        });
      } catch (notifErr) {
        console.warn("Failed to notify author of recipe missing details:", notifErr);
      }
    }

    // 3. Telegram Alert with 1-click action buttons and Secret Review URL if flagged
    if (aiAnalysisResult.verdict === "flagged") {
      try {
        await sendTelegramModerationAlert({
          entityType: "recipe",
          entityId: finalRecipeId,
          authorId: user.id,
          authorName: userProfile?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          title: trimmedTitle,
          verdict: "flagged",
          confidenceScore: aiAnalysisResult.confidence_score,
          executiveSummary: aiAnalysisResult.executive_summary || aiAnalysisResult.summary,
          issues: aiAnalysisResult.issues || [],
          reviewToken: reviewToken || undefined,
        });

        await createNotificationInternal({
          userId: user.id,
          type: "system",
          title: "Recipe Held for Security Review",
          message: `Your recipe "${trimmedTitle}" was flagged by security filters and is currently held for moderator review. You cannot edit or submit new recipes until it is reviewed.`,
          link: `/profile`,
          entityId: finalRecipeId,
        });
      } catch (tgErr) {
        console.warn("Failed to dispatch Telegram moderation alert:", tgErr);
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/search");
  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  revalidateTag("recipes", "max");
  revalidateTag("recipe-detail", "max");
  revalidateTag("author-profile", "max");

  if (recipeStatus === "locked") {
    return {
      success: true,
      recipeId: finalRecipeId,
      slug: slug || data.id || finalRecipeId,
      message: "Your recipe was submitted and is currently held for security review by moderators.",
    };
  }

  return { success: true, recipeId: finalRecipeId, slug: slug || data.id || finalRecipeId };
}

/**
 * Server Action: Publish a new recipe
 */
export async function publishRecipeAction(
  data: PublishRecipeInput
): Promise<RecipeActionResult> {
  return saveRecipeAction({
    ...data,
    isPublished: true,
  });
}

/**
 * Cached fetcher for published recipes list
 * - Served from Next.js server cache (0ms database response for repeated requests)
 * - Automatically revalidates every 60s or immediately on recipe create/update/delete
 */
const fetchCachedRecipes = unstable_cache(
  async (optionsKey: string) => {
    const options: {
      category?: string;
      mealType?: string;
      query?: string;
      limit?: number;
      offset?: number;
    } = JSON.parse(optionsKey);

    const supabase = createPublicClient();
    const limit = options?.limit ?? 12;
    const offset = options?.offset ?? 0;

    let query = supabase
      .from("recipes")
      .select(`
        id,
        slug,
        title,
        description,
        hero_image,
        category,
        meal_type,
        tag,
        dietary_tag,
        ingredients,
        cook_time,
        prep_time,
        rating,
        reviews_count,
        created_at,
        profiles:user_id (
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.category && options.category !== "All") {
      query = query.ilike("category", `%${options.category}%`);
    }

    if (options?.mealType && options.mealType !== "All") {
      query = query.eq("meal_type", options.mealType);
    }

    if (options?.query && options.query.trim()) {
      const cleanQ = options.query.trim();
      query = query.or(
        `title.ilike.%${cleanQ}%,category.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching recipes:", error);
      return [];
    }

    return data ?? [];
  },
  ["recipes-list"],
  {
    tags: ["recipes"],
    revalidate: 60,
  }
);

/**
 * Server Action: Get recipes for Feed / Search (Cached with instant revalidation)
 */
export async function getRecipesAction(options?: {
  category?: string;
  mealType?: string;
  query?: string;
  limit?: number;
  offset?: number;
}) {
  const optionsKey = JSON.stringify(options ?? {});
  return fetchCachedRecipes(optionsKey);
}

/**
 * Cached fetcher for single recipe detail
 * - Deduplicates requests across all users
 * - Automatically revalidates every 120s or immediately on author updates
 */
/**
 * Server Action: Get Single Recipe Detail by slug or ID
 */
export async function getRecipeDetailAction(idOrSlug: string) {
  if (!idOrSlug || typeof idOrSlug !== "string") return null;

  try {
    const supabase = createPublicClient();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    let query = supabase
      .from("recipes")
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          username,
          avatar_url,
          bio,
          tagline,
          status
        )
      `);

    if (isUUID) {
      query = query.eq("id", idOrSlug);
    } else {
      query = query.eq("slug", idOrSlug);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn("Could not fetch recipe from Supabase:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("Error in getRecipeDetailAction:", err);
    return null;
  }
}

/**
 * Server Action: Toggle Save / Bookmark a recipe
 */
export async function toggleSaveRecipeAction(recipeId: string): Promise<{
  success: boolean;
  isSaved?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to save recipes." };
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from("saved_recipes")
    .select("id")
    .eq("user_id", user.id)
    .eq("recipe_id", recipeId)
    .maybeSingle();

  if (existing) {
    // Unsave
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath("/profile");
    return { success: true, isSaved: false };
  } else {
    // Save
    const { error } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      recipe_id: recipeId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Trigger save notification to recipe author asynchronously
    try {
      const { data: rec } = await supabase
        .from("recipes")
        .select("user_id, title, slug")
        .eq("id", recipeId)
        .maybeSingle();

      if (rec && rec.user_id && rec.user_id !== user.id) {
        const { data: actorProfile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", user.id)
          .maybeSingle();

        const actorName =
          actorProfile?.full_name ||
          actorProfile?.username ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Someone";

        await createNotificationInternal({
          userId: rec.user_id,
          actorId: user.id,
          type: "save",
          title: "Recipe Saved",
          message: `${actorName} saved your recipe "${rec.title}"!`,
          link: `/recipe/${rec.slug || recipeId}`,
          entityId: recipeId,
          metadata: { recipeId },
        });
      }
    } catch (notifErr) {
      console.warn("Failed to dispatch save notification:", notifErr);
    }

    revalidatePath("/profile");
    revalidatePath("/saved");
    return { success: true, isSaved: true };
  }
}

/**
 * Server Action: Fetch user's saved recipes
 */
export async function getUserSavedRecipesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_recipes")
    .select(`
      id,
      created_at,
      recipe:recipe_id (
        id,
        slug,
        title,
        hero_image,
        category,
        cook_time,
        rating
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user saved recipes:", error);
    return [];
  }

  return (data || []).map((item) => item.recipe).filter(Boolean);
}

/**
 * Server Action: Fetch user's published recipes
 */
export async function getUserPublishedRecipesAction(userId?: string) {
  const supabase = await createClient();

  let targetUserId = userId;
  if (!targetUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    targetUserId = user?.id;
  }

  if (!targetUserId) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select(`
      id,
      slug,
      title,
      hero_image,
      category,
      cook_time,
      rating,
      is_published,
      created_at
    `)
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user published recipes:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Server Action: Delete a recipe
 */
export async function deleteRecipeAction(recipeId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId);
  let query = supabase.from("recipes").delete().eq("user_id", user.id);
  if (isUUID) {
    query = query.eq("id", recipeId);
  } else {
    query = query.eq("slug", recipeId);
  }

  const { error } = await query;
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/search");
  revalidateTag("recipes", "max");
  revalidateTag("recipe-detail", "max");
  revalidateTag("author-profile", "max");
  return { success: true };
}

/**
 * Server Action: Submit or Update a Recipe Review & Rating
 */
export async function submitRecipeReviewAction(data: {
  recipeId: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; error?: string; averageRating?: number; totalReviews?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to submit a review." };
  }

  if (!data.rating || data.rating < 1 || data.rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5 stars." };
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.recipeId);
  let targetRecipeId = data.recipeId;

  // If slug was passed, resolve real UUID
  if (!isUUID) {
    const { data: rec } = await supabase
      .from("recipes")
      .select("id")
      .eq("slug", data.recipeId)
      .maybeSingle();
    if (!rec) {
      return { success: false, error: "Recipe not found." };
    }
    targetRecipeId = rec.id;
  }

  // Automated AI Review Moderation (Spam / Abusive content filtering)
  let reviewAiStatus: "approved" | "flagged" = "approved";
  let reviewAiAnalysis: any = null;
  if (data.comment?.trim()) {
    try {
      reviewAiAnalysis = await analyzeReviewWithAi(data.comment, data.rating);
      if (reviewAiAnalysis.verdict === "flagged") {
        reviewAiStatus = "flagged";
      }
    } catch (revErr) {
      console.warn("AI review moderation skipped:", revErr);
    }
  }

  // Upsert review (unique on user_id, recipe_id)
  const { data: upsertedReview, error: reviewError } = await supabase
    .from("recipe_reviews")
    .upsert(
      {
        user_id: user.id,
        recipe_id: targetRecipeId,
        rating: Math.round(data.rating),
        comment: data.comment?.trim() || null,
        ai_status: reviewAiStatus,
        ai_analysis: reviewAiAnalysis || {},
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id, recipe_id" }
    )
    .select("id")
    .single();

  if (reviewError) {
    console.error("Error submitting review:", reviewError);
    return { success: false, error: reviewError.message };
  }

  // If review was flagged as spam/abusive by AI:
  if (reviewAiStatus === "flagged" && upsertedReview?.id) {
    try {
      await supabase.from("ai_moderation_reports").insert({
        entity_type: "review",
        entity_id: upsertedReview.id,
        author_id: user.id,
        verdict: "flagged",
        confidence_score: reviewAiAnalysis?.confidence_score ?? 0.2,
        issues: reviewAiAnalysis?.issues || ["Spam/abusive review comment"],
        executive_summary: reviewAiAnalysis?.executive_summary || "Review flagged for spam or abusive language.",
        action_taken: "telegram_alert_sent",
        reviewed_by_channel: "ai_worker",
      });

      await sendTelegramModerationAlert({
        entityType: "review",
        entityId: upsertedReview.id,
        authorId: user.id,
        authorName: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        title: `Spam Review Flagged (${data.rating}★)`,
        verdict: "flagged",
        confidenceScore: reviewAiAnalysis?.confidence_score ?? 0.2,
        executiveSummary: reviewAiAnalysis?.executive_summary || "Review flagged for advertising or inappropriate tone.",
        issues: reviewAiAnalysis?.issues || [],
      });
    } catch (alertErr) {
      console.warn("Failed to dispatch review alert:", alertErr);
    }
  }

  // Recalculate average rating & reviews_count for the recipe
  const { data: allReviews } = await supabase
    .from("recipe_reviews")
    .select("rating")
    .eq("recipe_id", targetRecipeId);

  const count = allReviews?.length || 1;
  const avg =
    allReviews && allReviews.length > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
      : data.rating;

  await supabase
    .from("recipes")
    .update({
      rating: avg,
      reviews_count: count,
    })
    .eq("id", targetRecipeId);

  // Trigger review notification to recipe author asynchronously
  try {
    const { data: rec } = await supabase
      .from("recipes")
      .select("user_id, title, slug")
      .eq("id", targetRecipeId)
      .maybeSingle();

    if (rec && rec.user_id && rec.user_id !== user.id) {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      const actorName =
        actorProfile?.full_name ||
        actorProfile?.username ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Someone";

      const commentSnippet = data.comment?.trim()
        ? ` "${data.comment.trim().length > 50 ? data.comment.trim().substring(0, 47) + '...' : data.comment.trim()}"`
        : "";

      await createNotificationInternal({
        userId: rec.user_id,
        actorId: user.id,
        type: "review",
        title: "New Review on Your Recipe",
        message: `${actorName} gave "${rec.title}" ${data.rating}★${commentSnippet ? ': ' + commentSnippet : ''}`,
        link: `/recipe/${rec.slug || targetRecipeId}#reviews`,
        entityId: targetRecipeId,
        metadata: { rating: data.rating, recipeId: targetRecipeId },
      });
    }
  } catch (notifErr) {
    console.warn("Failed to dispatch review notification:", notifErr);
  }

  revalidatePath(`/recipe/${data.recipeId}`);
  revalidatePath("/search");
  revalidatePath("/");

  return { success: true, averageRating: avg, totalReviews: count };
}

/**
 * Server Action: Get all reviews for a recipe
 */
export async function getRecipeReviewsAction(recipeIdOrSlug: string) {
  const supabase = await createClient();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeIdOrSlug);
  let targetRecipeId = recipeIdOrSlug;

  if (!isUUID) {
    const { data: rec } = await supabase
      .from("recipes")
      .select("id")
      .eq("slug", recipeIdOrSlug)
      .maybeSingle();
    if (!rec) return [];
    targetRecipeId = rec.id;
  }

  const { data, error } = await supabase
    .from("recipe_reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      profiles:user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("recipe_id", targetRecipeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading reviews:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Server Action: Sync guest saved recipes to authenticated user
 */
export async function syncGuestSavedRecipesAction(
  recipeIdsOrSlugs: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!recipeIdsOrSlugs || recipeIdsOrSlugs.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, count: 0, error: "User not authenticated" };
  }

  const validUuids = recipeIdsOrSlugs.filter((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );
  const slugs = recipeIdsOrSlugs.filter(
    (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  );

  let query = supabase.from("recipes").select("id, slug");
  if (validUuids.length > 0 && slugs.length > 0) {
    query = query.or(`id.in.(${validUuids.join(",")}),slug.in.(${slugs.map((s) => `"${s}"`).join(",")})`);
  } else if (validUuids.length > 0) {
    query = query.in("id", validUuids);
  } else if (slugs.length > 0) {
    query = query.in("slug", slugs);
  }

  const { data: recipes } = await query;
  if (!recipes || recipes.length === 0) {
    return { success: true, count: 0 };
  }

  const rows = recipes.map((r) => ({
    user_id: user.id,
    recipe_id: r.id,
  }));

  const { error } = await supabase
    .from("saved_recipes")
    .upsert(rows, { onConflict: "user_id, recipe_id", ignoreDuplicates: true });

  if (error) {
    console.error("Error syncing guest saved recipes:", error);
    return { success: false, count: 0, error: error.message };
  }

  revalidatePath("/profile");
  return { success: true, count: rows.length };
}

export interface RecipeBoardData {
  id: string;
  name: string;
  description?: string;
  recipeIds: string[];
  createdAt: string;
}

/**
 * Server Action: Get all boards for current authenticated user
 */
export async function getUserBoardsAction(): Promise<RecipeBoardData[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("recipe_boards")
    .select("id, name, description, recipe_ids, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Error fetching user boards from Supabase:", error.message);
    return [];
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    description: b.description || undefined,
    recipeIds: Array.isArray(b.recipe_ids) ? b.recipe_ids : [],
    createdAt: b.created_at,
  }));
}

/**
 * Server Action: Create a new Pinterest board in Supabase
 */
export async function createBoardAction(data: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; board?: RecipeBoardData; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to create a board." };
  }

  const trimmed = data.name?.trim();
  if (!trimmed) {
    return { success: false, error: "Board name is required." };
  }

  const { data: inserted, error } = await supabase
    .from("recipe_boards")
    .insert({
      user_id: user.id,
      name: trimmed,
      description: data.description?.trim() || null,
      recipe_ids: [],
    })
    .select("id, name, description, recipe_ids, created_at")
    .single();

  if (error || !inserted) {
    return { success: false, error: error?.message || "Failed to create board" };
  }

  revalidatePath("/saved");
  return {
    success: true,
    board: {
      id: inserted.id,
      name: inserted.name,
      description: inserted.description || undefined,
      recipeIds: inserted.recipe_ids || [],
      createdAt: inserted.created_at,
    },
  };
}

/**
 * Server Action: Update board details (name, description, or recipe IDs)
 */
export async function updateBoardAction(data: {
  id: string;
  name?: string;
  description?: string;
  recipeIds?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to update a board." };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (!trimmed) return { success: false, error: "Board name cannot be empty." };
    updates.name = trimmed;
  }
  if (data.description !== undefined) {
    updates.description = data.description.trim() || null;
  }
  if (data.recipeIds !== undefined) {
    updates.recipe_ids = data.recipeIds;
  }

  const { error } = await supabase
    .from("recipe_boards")
    .update(updates)
    .eq("id", data.id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/saved");
  return { success: true };
}

/**
 * Server Action: Delete a board from Supabase
 */
export async function deleteBoardAction(boardId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("recipe_boards")
    .delete()
    .eq("id", boardId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/saved");
  return { success: true };
}

/**
 * Server Action: Toggle a recipe inside a board
 */
export async function toggleRecipeInBoardAction(
  boardId: string,
  recipeId: string
): Promise<{ success: boolean; inBoard?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Please log in to manage boards." };
  }

  const { data: board, error: fetchErr } = await supabase
    .from("recipe_boards")
    .select("recipe_ids")
    .eq("id", boardId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !board) {
    return { success: false, error: "Board not found" };
  }

  const currentIds: string[] = Array.isArray(board.recipe_ids) ? board.recipe_ids : [];
  const exists = currentIds.includes(recipeId);
  const nextIds = exists
    ? currentIds.filter((id) => id !== recipeId)
    : [...currentIds, recipeId];

  const { error: updateErr } = await supabase
    .from("recipe_boards")
    .update({
      recipe_ids: nextIds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", boardId)
    .eq("user_id", user.id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath("/saved");
  return { success: true, inBoard: !exists };
}

/**
 * Cached fetcher for public author profile and their published recipes
 */
const fetchCachedPublicAuthorProfile = unstable_cache(
  async (userId: string) => {
    const supabase = createPublicClient();

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    let profileQuery = supabase.from("profiles").select("*");
    if (isUUID) {
      profileQuery = profileQuery.eq("id", userId);
    } else {
      profileQuery = profileQuery.eq("username", userId);
    }

    const { data: profile, error: profileErr } = await profileQuery.maybeSingle();

    if (profileErr || !profile) {
      return null;
    }

    // Fetch author's published recipes
    const { data: recipes } = await supabase
      .from("recipes")
      .select(`
        id,
        slug,
        title,
        hero_image,
        category,
        cook_time,
        rating,
        reviews_count,
        created_at
      `)
      .eq("user_id", profile.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    return {
      profile: {
        id: profile.id,
        name: profile.full_name || profile.username || "Chef",
        username: profile.username || "chef",
        avatarUrl: profile.avatar_url || "",
        bio: profile.bio || "",
        tagline: profile.tagline || "",
        status: profile.status || "",
        createdAt: profile.created_at,
      },
      recipes: (recipes || []).map((r: any) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        hero_image: r.hero_image,
        category: r.category,
        cook_time: r.cook_time,
        rating: Number(r.rating) || 5.0,
        reviews_count: r.reviews_count || 0,
        created_at: r.created_at,
      })),
    };
  },
  ["author-profile"],
  {
    tags: ["recipes", "author-profile"],
    revalidate: 120, // 2 minutes TTL
  }
);

/**
 * Server Action: Fetch public author profile and their published recipes (Cached)
 */
export async function getPublicAuthorProfileAction(userId: string) {
  return fetchCachedPublicAuthorProfile(userId);
}
