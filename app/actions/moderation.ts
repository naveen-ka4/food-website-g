"use server";

import { createAdminServiceClient } from "@/lib/supabase/service";
import { sendTelegramSpamStrikeWarning } from "@/lib/telegram/bot";

export interface SecretRecipeDossier {
  id: string;
  title: string;
  description?: string | null;
  hero_image?: string | null;
  category?: string | null;
  cook_time?: number | null;
  prep_time?: number | null;
  default_servings?: number | null;
  ingredients?: any[];
  instructions?: any[];
  status: string;
  ai_score?: number | null;
  ai_analysis?: any;
  created_at: string;
  author?: {
    id: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    spam_strikes?: number;
  };
}

/**
 * Fetches a locked recipe using its secret review token.
 * Accessible without session login because the random token acts as a cryptographic capability key.
 */
export async function getRecipeBySecretTokenAction(token: string): Promise<{
  success: boolean;
  recipe?: SecretRecipeDossier;
  isResolved?: boolean;
  error?: string;
}> {
  try {
    const trimmedToken = (token || "").trim();
    if (!trimmedToken) {
      return { success: false, error: "Missing or invalid review token." };
    }

    const supabase = createAdminServiceClient();
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select(
        `
        id,
        title,
        description,
        hero_image,
        category,
        cook_time,
        prep_time,
        default_servings,
        ingredients,
        instructions,
        status,
        ai_score,
        ai_analysis,
        created_at,
        review_token,
        author:user_id (id, username, full_name, avatar_url, spam_strikes)
      `
      )
      .eq("review_token", trimmedToken)
      .single();

    if (error || !recipe) {
      return {
        success: false,
        isResolved: true,
        error: "This review ticket has already been resolved or the token has expired.",
      };
    }

    return {
      success: true,
      recipe: recipe as any,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load recipe dossier." };
  }
}

/**
 * Resolves a locked recipe via Secret Review URL (Approve or Reject).
 */
export async function resolveRecipeBySecretTokenAction(
  token: string,
  decision: "approve" | "reject",
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmedToken = (token || "").trim();
    if (!trimmedToken) {
      return { success: false, error: "Invalid token." };
    }

    const supabase = createAdminServiceClient();
    const { data: recipe, error: fetchErr } = await supabase
      .from("recipes")
      .select("id, title, user_id, author:user_id(id, username, spam_strikes)")
      .eq("review_token", trimmedToken)
      .single();

    if (fetchErr || !recipe) {
      return { success: false, error: "Recipe ticket not found or already resolved." };
    }

    const nowIso = new Date().toISOString();

    if (decision === "approve") {
      // Approve and publish
      const { error: updateErr } = await supabase
        .from("recipes")
        .update({
          status: "approved",
          is_published: true,
          review_token: null, // Token consumed
          reviewed_at: nowIso,
          moderation_note: "Approved via Secret Review URL",
        })
        .eq("id", recipe.id);

      if (updateErr) throw updateErr;

      // In-app notification to author
      if (recipe.user_id) {
        await supabase.from("notifications").insert({
          user_id: recipe.user_id,
          type: "system",
          title: "🎉 Recipe Approved!",
          message: `Good news! Your recipe "${recipe.title}" has been reviewed and approved.`,
          link: `/recipe/${recipe.id}`,
          entity_id: recipe.id,
        });
      }

      await supabase.from("ai_moderation_reports").insert({
        entity_type: "recipe",
        entity_id: recipe.id,
        verdict: "safe",
        executive_summary: "Recipe approved and published by Admin via Secret Review URL.",
        action_taken: "auto_approved",
        reviewed_by_channel: "secret_review_url",
        created_at: nowIso,
      });

      return { success: true };
    } else {
      // Reject, apply 5h cooldown, increment strikes
      const cooldownUntil = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
      let newStrikes = 1;

      if (recipe.user_id) {
        const authorProfile: any = recipe.author;
        const currentStrikes = authorProfile?.spam_strikes || 0;
        newStrikes = currentStrikes + 1;

        await supabase
          .from("profiles")
          .update({
            cooldown_until: cooldownUntil,
            spam_strikes: newStrikes,
          })
          .eq("id", recipe.user_id);

        await supabase.from("notifications").insert({
          user_id: recipe.user_id,
          type: "system",
          title: "Recipe Rejected (5-Hour Cooldown)",
          message: `Your recipe "${recipe.title}" was rejected for violating guidelines: ${
            rejectionReason || "Spam or inappropriate content"
          }. Your account is on a 5-hour cooldown.`,
          link: `/recipe/${recipe.id}`,
          entity_id: recipe.id,
        });

        // 5-strike alert
        if (newStrikes >= 5) {
          await sendTelegramSpamStrikeWarning({
            userId: recipe.user_id,
            username: authorProfile?.username || "Unknown",
            strikes: newStrikes,
            lastRecipeTitle: recipe.title,
          });
        }
      }

      const { error: updateErr } = await supabase
        .from("recipes")
        .update({
          status: "rejected",
          is_published: false,
          review_token: null, // Token consumed
          reviewed_at: nowIso,
          moderation_note: rejectionReason || "Rejected via Secret Review URL",
        })
        .eq("id", recipe.id);

      if (updateErr) throw updateErr;

      await supabase.from("ai_moderation_reports").insert({
        entity_type: "recipe",
        entity_id: recipe.id,
        author_id: recipe.user_id,
        verdict: "rejected",
        executive_summary: `Recipe rejected via Secret Review URL. Applied 5h cooldown (Strike #${newStrikes}).`,
        action_taken: "manual_reviewed",
        reviewed_by_channel: "secret_review_url",
        created_at: nowIso,
      });

      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve recipe." };
  }
}

