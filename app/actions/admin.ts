"use server";

import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/auth/admin";
import { analyzeRecipeWithAi, getActiveAiProviderInfo } from "@/lib/ai/moderator";

export interface AdminStats {
  totalRecipes: number;
  pendingRecipes: number;
  approvedRecipes: number;
  rejectedRecipes: number;
  totalReviews: number;
  averageRating: number;
  totalCategories: number;
  totalTags: number;
  promotedTags: number;
  totalUsers: number;
  bannedUsers: number;
}

/**
 * 1. Overview Dashboard Metrics & Queue Status
 */
export async function getAdminStatsAction(): Promise<{
  success: boolean;
  stats?: AdminStats;
  recentRecipes?: any[];
  recentReviews?: any[];
  aiProvider?: { provider: string; model: string };
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();

    // Fetch counts in parallel
    const [
      recipesCountRes,
      pendingCountRes,
      approvedCountRes,
      rejectedCountRes,
      reviewsCountRes,
      categoriesCountRes,
      tagsCountRes,
      promotedTagsCountRes,
      usersCountRes,
      bannedUsersRes,
      recentRecipesRes,
      recentReviewsRes,
    ] = await Promise.all([
      supabase.from("recipes").select("*", { count: "exact", head: true }),
      supabase.from("recipes").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("recipes").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("recipes").select("*", { count: "exact", head: true }).eq("status", "rejected"),
      supabase.from("recipe_reviews").select("*", { count: "exact", head: true }),
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase.from("tags").select("*", { count: "exact", head: true }),
      supabase.from("tags").select("*", { count: "exact", head: true }).eq("is_promoted", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
      supabase
        .from("recipes")
        .select(`
          id, title, slug, hero_image, category, meal_type, is_published, status, ai_score, ai_analysis, created_at,
          profiles:user_id (id, username, full_name, avatar_url, is_banned)
        `)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("recipe_reviews")
        .select(`
          id, rating, comment, created_at,
          profiles:user_id (username, full_name, avatar_url),
          recipes:recipe_id (id, title, slug)
        `)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const totalRecipes = recipesCountRes.count || 0;
    const pendingRecipes = pendingCountRes.count || 0;
    const approvedRecipes = approvedCountRes.count || 0;
    const rejectedRecipes = rejectedCountRes.count || 0;

    return {
      success: true,
      stats: {
        totalRecipes,
        pendingRecipes,
        approvedRecipes,
        rejectedRecipes,
        totalReviews: reviewsCountRes.count || 0,
        averageRating: 4.8,
        totalCategories: categoriesCountRes.count || 0,
        totalTags: tagsCountRes.count || 0,
        promotedTags: promotedTagsCountRes.count || 0,
        totalUsers: usersCountRes.count || 0,
        bannedUsers: bannedUsersRes.count || 0,
      },
      recentRecipes: recentRecipesRes.data || [],
      recentReviews: recentReviewsRes.data || [],
      aiProvider: getActiveAiProviderInfo(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load admin stats." };
  }
}

/**
 * 2. Review Queue: List Recipes by Status with AI Score
 */
export async function getReviewQueueAction(params: {
  status?: "pending" | "approved" | "rejected" | "all";
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "created_at" | "ai_score";
  sortOrder?: "asc" | "desc";
}): Promise<{
  success: boolean;
  recipes?: any[];
  total?: number;
  page: number;
  totalPages: number;
  pendingCount?: number;
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("recipes")
      .select(
        `
        id, title, slug, description, hero_image, category, meal_type, cook_time, prep_time,
        status, ai_score, ai_analysis, moderation_note, created_at,
        profiles:user_id (id, username, full_name, avatar_url, is_banned)
      `,
        { count: "exact" }
      );

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`title.ilike.${term},description.ilike.${term}`);
    }

    const sortCol = params.sortBy || "created_at";
    const ascending = params.sortOrder === "asc";
    query = query.order(sortCol, { ascending }).range(offset, offset + limit - 1);

    const [{ data, count, error }, pendingRes] = await Promise.all([
      query,
      supabase.from("recipes").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    if (error) throw error;

    return {
      success: true,
      recipes: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit) || 1,
      pendingCount: pendingRes.count || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      recipes: [],
      total: 0,
      page: 1,
      totalPages: 1,
      error: err.message || "Failed to load review queue.",
    };
  }
}

/**
 * 3. Recipe Inspection Dossier Fetch
 */
export async function getRecipeInspectionDataAction(recipeId: string): Promise<{
  success: boolean;
  recipe?: any;
  userStats?: {
    totalRecipes: number;
    approvedRecipes: number;
    rejectedRecipes: number;
  };
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();

    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(
        `
        *,
        author:user_id (id, username, full_name, avatar_url, is_banned, created_at)
      `
      )
      .eq("id", recipeId)
      .single();

    if (error || !recipe) {
      throw error || new Error("Recipe not found.");
    }

    // Fetch author's submission track record for trust scoring
    let userStats = {
      totalRecipes: 0,
      approvedRecipes: 0,
      rejectedRecipes: 0,
    };

    if (recipe.user_id) {
      const [allRes, approvedRes, rejectedRes] = await Promise.all([
        supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", recipe.user_id),
        supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", recipe.user_id).eq("status", "approved"),
        supabase.from("recipes").select("*", { count: "exact", head: true }).eq("user_id", recipe.user_id).eq("status", "rejected"),
      ]);
      userStats = {
        totalRecipes: allRes.count || 0,
        approvedRecipes: approvedRes.count || 0,
        rejectedRecipes: rejectedRes.count || 0,
      };
    }

    return {
      success: true,
      recipe,
      userStats,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch recipe dossier." };
  }
}

/**
 * 4. Approve Recipe (1-Click Action)
 */
export async function approveRecipeAction(
  recipeId: string,
  options?: {
    additionalTags?: string[];
    category?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: admin, supabase } = await verifyAdminSession();

    const updatePayload: Record<string, any> = {
      status: "approved",
      is_published: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      moderation_note: null,
      updated_at: new Date().toISOString(),
    };

    if (options?.category) {
      updatePayload.category = options.category;
    }

    // Append AI suggested tags if chosen
    if (options?.additionalTags && options.additionalTags.length > 0) {
      const { data: current } = await supabase
        .from("recipes")
        .select("tags")
        .eq("id", recipeId)
        .single();

      const existingTags: string[] = current?.tags || [];
      const merged = Array.from(new Set([...existingTags, ...options.additionalTags]));
      updatePayload.tags = merged;
    }

    const { error } = await supabase.from("recipes").update(updatePayload).eq("id", recipeId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to approve recipe." };
  }
}

/**
 * 5. Reject Recipe (With Rejection Note)
 */
export async function rejectRecipeAction(
  recipeId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: admin, supabase } = await verifyAdminSession();

    if (!reason || !reason.trim()) {
      throw new Error("Please specify a reason for rejecting this recipe.");
    }

    const { error } = await supabase
      .from("recipes")
      .update({
        status: "rejected",
        is_published: false,
        moderation_note: reason.trim(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/recipes");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reject recipe." };
  }
}

/**
 * 6. Quick Edit & Approve (Inline Tweak)
 */
export async function quickEditAndApproveRecipeAction(
  recipeId: string,
  updates: {
    title?: string;
    description?: string;
    category?: string;
    meal_type?: string;
    tags?: string[];
    prep_time?: number;
    cook_time?: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: admin, supabase } = await verifyAdminSession();

    const payload: Record<string, any> = {
      ...updates,
      status: "approved",
      is_published: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      moderation_note: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("recipes").update(payload).eq("id", recipeId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to quick-edit and approve." };
  }
}

/**
 * 7. Trigger AI Re-Analysis on Demand
 */
export async function triggerAiReanalysisAction(
  recipeId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession();

    const { data: recipe, error: fetchErr } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (fetchErr || !recipe) throw fetchErr || new Error("Recipe not found.");

    const analysis = await analyzeRecipeWithAi({
      title: recipe.title,
      description: recipe.description,
      category: recipe.category,
      meal_type: recipe.meal_type,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      default_servings: recipe.default_servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      hero_image: recipe.hero_image,
    });

    const { error: updateErr } = await supabase
      .from("recipes")
      .update({
        ai_score: analysis.confidence_score,
        ai_analysis: analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (updateErr) throw updateErr;

    revalidatePath("/admin");
    revalidatePath(`/admin/inspect/${recipeId}`);

    return { success: true, result: analysis };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to re-analyze recipe." };
  }
}

/**
 * 8. User Ban / Spammer Suspension
 */
export async function toggleUserBanAction(
  userId: string,
  isBanned: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentAdmin, supabase } = await verifyAdminSession({
      requireSuperAdmin: true,
    });

    if (currentAdmin.id === userId && isBanned) {
      throw new Error("Safety rule: You cannot ban your own administrator account.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: isBanned, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update user ban status." };
  }
}

/**
 * 9. Standard Recipes List (Catalog View)
 */
export async function getAdminRecipesAction(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "all" | "pending" | "approved" | "rejected";
  category?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{
  success: boolean;
  recipes?: any[];
  total?: number;
  page: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 15));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("recipes")
      .select(
        `
        id, title, slug, description, hero_image, category, meal_type, cook_time, prep_time,
        rating, reviews_count, is_published, status, ai_score, created_at, updated_at,
        profiles:user_id (id, username, full_name, avatar_url, is_banned)
      `,
        { count: "exact" }
      );

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`title.ilike.${term},description.ilike.${term}`);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params.category && params.category !== "all") {
      query = query.eq("category", params.category);
    }

    const sortColumn = params.sortBy || "created_at";
    const ascending = params.sortOrder === "asc";
    query = query.order(sortColumn, { ascending }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      success: true,
      recipes: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    };
  } catch (err: any) {
    return {
      success: false,
      recipes: [],
      total: 0,
      page: 1,
      totalPages: 1,
      error: err.message || "Failed to load recipes.",
    };
  }
}

/**
 * Toggle Recipe Published Status (Compatibility helper)
 */
export async function toggleRecipePublishAction(
  recipeId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession();

    const { error } = await supabase
      .from("recipes")
      .update({
        is_published: isPublished,
        status: isPublished ? "approved" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipeId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle recipe status." };
  }
}

/**
 * 10. Delete Recipe (Admin)
 */
export async function deleteRecipeAdminAction(
  recipeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession({ requireSuperAdmin: true });

    const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete recipe." };
  }
}

/**
 * 11. Categories Management
 */
export async function getAdminCategoriesAction(): Promise<{
  success: boolean;
  categories?: any[];
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return { success: true, categories: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load categories." };
  }
}

export async function createCategoryAction(data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession();

    const { error } = await supabase.from("categories").insert([
      {
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase(),
        description: data.description?.trim() || null,
        icon: data.icon?.trim() || null,
      },
    ]);

    if (error) throw error;

    revalidatePath("/admin/categories");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create category." };
  }
}

export async function deleteCategoryAction(
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession({ requireSuperAdmin: true });

    const { error } = await supabase.from("categories").delete().eq("id", categoryId);

    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete category." };
  }
}

/**
 * 12. Tags Management & Promotion
 */
export async function getAdminTagsAction(params?: {
  search?: string;
  promotedOnly?: boolean;
}): Promise<{
  success: boolean;
  tags?: any[];
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();

    let query = supabase.from("tags").select("*");

    if (params?.search && params.search.trim()) {
      query = query.ilike("name", `%${params.search.trim()}%`);
    }

    if (params?.promotedOnly) {
      query = query.eq("is_promoted", true);
    }

    query = query.order("usage_count", { ascending: false }).limit(100);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, tags: data || [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load tags." };
  }
}

export async function toggleTagPromotedAction(
  tagId: string,
  isPromoted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession();

    const { error } = await supabase
      .from("tags")
      .update({ is_promoted: isPromoted, updated_at: new Date().toISOString() })
      .eq("id", tagId);

    if (error) throw error;

    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update tag." };
  }
}

/**
 * 13. Reviews Moderation
 */
export async function getAdminReviewsAction(params?: {
  page?: number;
  limit?: number;
  search?: string;
  minRating?: number;
  maxRating?: number;
}): Promise<{
  success: boolean;
  reviews?: any[];
  total?: number;
  page: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(50, Math.max(1, params?.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("recipe_reviews")
      .select(
        `
        id, rating, comment, created_at, updated_at,
        profiles:user_id (id, username, full_name, avatar_url, is_banned),
        recipes:recipe_id (id, title, slug)
      `,
        { count: "exact" }
      );

    if (params?.search && params.search.trim()) {
      query = query.ilike("comment", `%${params.search.trim()}%`);
    }

    if (params?.minRating) {
      query = query.gte("rating", params.minRating);
    }
    if (params?.maxRating) {
      query = query.lte("rating", params.maxRating);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      success: true,
      reviews: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    };
  } catch (err: any) {
    return {
      success: false,
      reviews: [],
      total: 0,
      page: 1,
      totalPages: 1,
      error: err.message || "Failed to load reviews.",
    };
  }
}

export async function deleteReviewAdminAction(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdminSession();

    const { error } = await supabase.from("recipe_reviews").delete().eq("id", reviewId);

    if (error) throw error;

    revalidatePath("/admin/reviews");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete review." };
  }
}

/**
 * 14. User Management & Role Assignment
 */
export async function getAdminUsersAction(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  bannedOnly?: boolean;
}): Promise<{
  success: boolean;
  users?: any[];
  total?: number;
  page: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(50, Math.max(1, params?.limit || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, role, is_banned, created_at, status", {
        count: "exact",
      });

    if (params?.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query = query.or(`username.ilike.${term},full_name.ilike.${term}`);
    }

    if (params?.role && params.role !== "all") {
      query = query.eq("role", params.role);
    }

    if (params?.bannedOnly) {
      query = query.eq("is_banned", true);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      success: true,
      users: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit) || 1,
    };
  } catch (err: any) {
    return {
      success: false,
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
      error: err.message || "Failed to load users.",
    };
  }
}

export async function updateUserRoleAction(
  userId: string,
  newRole: "user" | "moderator" | "admin"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentAdmin, supabase } = await verifyAdminSession({
      requireSuperAdmin: true,
    });

    if (currentAdmin.id === userId && newRole !== "admin") {
      throw new Error("Safety check: You cannot demote yourself from Admin.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update role." };
  }
}

/**
 * 15. AI Moderation Reports & Non-Coder Audit Activity Hub
 */
export interface ModerationReportItem {
  id: string;
  entityType: "recipe" | "review" | "user";
  entityId: string;
  authorId?: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  verdict: "safe" | "needs_info" | "flagged" | "rejected" | "banned";
  confidenceScore: number;
  issues: string[];
  suggestedTags: string[];
  executiveSummary: string;
  actionTaken: "auto_approved" | "author_notified" | "telegram_alert_sent" | "manual_reviewed" | "pending_confirmation";
  reviewedByChannel: "ai_worker" | "telegram_button" | "admin_ui";
  imageAnalysis?: any;
  createdAt: string;
}

export interface ModerationReportsSummary {
  totalAnalyzed: number;
  autoApproved: number;
  authorNotified: number;
  flaggedIntercepted: number;
  telegramActions: number;
}

export async function getAdminModerationReportsAction(params?: {
  filter?: "all" | "flagged" | "needs_info" | "telegram_actions";
  limit?: number;
}): Promise<{
  success: boolean;
  reports?: ModerationReportItem[];
  summary?: ModerationReportsSummary;
  error?: string;
}> {
  try {
    const { supabase } = await verifyAdminSession();
    const limit = params?.limit ?? 40;
    const filter = params?.filter ?? "all";

    let query = supabase
      .from("ai_moderation_reports")
      .select(`
        *,
        author:author_id (
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filter === "flagged") {
      query = query.in("verdict", ["flagged", "rejected", "banned"]);
    } else if (filter === "needs_info") {
      query = query.eq("verdict", "needs_info");
    } else if (filter === "telegram_actions") {
      query = query.eq("reviewed_by_channel", "telegram_button");
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    // Fetch summary metrics
    const [totalRes, approvedRes, notifiedRes, flaggedRes, telegramRes] = await Promise.all([
      supabase.from("ai_moderation_reports").select("*", { count: "exact", head: true }),
      supabase.from("ai_moderation_reports").select("*", { count: "exact", head: true }).eq("action_taken", "auto_approved"),
      supabase.from("ai_moderation_reports").select("*", { count: "exact", head: true }).eq("action_taken", "author_notified"),
      supabase.from("ai_moderation_reports").select("*", { count: "exact", head: true }).in("verdict", ["flagged", "rejected", "banned"]),
      supabase.from("ai_moderation_reports").select("*", { count: "exact", head: true }).eq("reviewed_by_channel", "telegram_button"),
    ]);

    const reports: ModerationReportItem[] = (rows || []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      authorId: row.author_id,
      authorName: row.author?.full_name || row.author?.username || "Community User",
      authorUsername: row.author?.username,
      authorAvatar: row.author?.avatar_url,
      verdict: row.verdict,
      confidenceScore: Number(row.confidence_score ?? 0.95),
      issues: row.issues || [],
      suggestedTags: row.suggested_tags || [],
      executiveSummary: row.executive_summary || "Automated analysis completed.",
      actionTaken: row.action_taken,
      reviewedByChannel: row.reviewed_by_channel,
      imageAnalysis: row.image_analysis || {},
      createdAt: row.created_at,
    }));

    return {
      success: true,
      reports,
      summary: {
        totalAnalyzed: totalRes.count || 0,
        autoApproved: approvedRes.count || 0,
        authorNotified: notifiedRes.count || 0,
        flaggedIntercepted: flaggedRes.count || 0,
        telegramActions: telegramRes.count || 0,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load moderation reports." };
  }
}

export async function confirmAiRecommendationAction(
  reportId: string,
  action: "approve" | "reject" | "ban"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user: currentAdmin } = await verifyAdminSession();

    // Fetch report details
    const { data: report, error: repErr } = await supabase
      .from("ai_moderation_reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (repErr || !report) throw repErr || new Error("Moderation report not found.");

    const nowIso = new Date().toISOString();

    if (action === "approve") {
      if (report.entity_type === "recipe") {
        await supabase
          .from("recipes")
          .update({
            status: "approved",
            is_published: true,
            reviewed_at: nowIso,
            reviewed_by: currentAdmin.id,
            moderation_note: "Approved by Admin confirmation",
          })
          .eq("id", report.entity_id);
      }
    } else if (action === "reject") {
      if (report.entity_type === "recipe") {
        await supabase
          .from("recipes")
          .update({
            status: "rejected",
            is_published: false,
            reviewed_at: nowIso,
            reviewed_by: currentAdmin.id,
            moderation_note: "Rejected by Admin confirmation",
          })
          .eq("id", report.entity_id);
      } else if (report.entity_type === "review") {
        await supabase
          .from("recipe_reviews")
          .update({ ai_status: "deleted" })
          .eq("id", report.entity_id);
      }
    } else if (action === "ban") {
      if (report.author_id) {
        await supabase
          .from("profiles")
          .update({ is_banned: true })
          .eq("id", report.author_id);

        await supabase
          .from("recipes")
          .update({ is_published: false, status: "rejected" })
          .eq("user_id", report.author_id);
      }
    }

    // Update report status
    await supabase
      .from("ai_moderation_reports")
      .update({
        action_taken: "manual_reviewed",
        reviewed_by_channel: "admin_ui",
      })
      .eq("id", reportId);

    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to confirm recommendation." };
  }
}
