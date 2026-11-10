"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotificationInternal } from "./notifications";

export interface ReviewReplyItem {
  id: string;
  reviewId: string;
  recipeId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    fullName?: string;
    username?: string;
    avatarUrl?: string;
  };
}

/**
 * Server Action: Submit a reply to a review
 */
export async function submitReviewReplyAction(params: {
  reviewId: string;
  recipeId: string;
  comment: string;
}): Promise<{ success: boolean; error?: string; reply?: ReviewReplyItem }> {
  const commentText = params.comment.trim();
  if (!commentText) {
    return { success: false, error: "Reply cannot be empty" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to reply" };
  }

  // 1. Insert reply
  const { data: inserted, error: insertError } = await supabase
    .from("review_replies")
    .insert({
      review_id: params.reviewId,
      recipe_id: params.recipeId,
      user_id: user.id,
      comment: commentText,
    })
    .select(`
      id,
      review_id,
      recipe_id,
      user_id,
      comment,
      created_at
    `)
    .single();

  if (insertError) {
    console.error("Error inserting review reply:", insertError);
    return { success: false, error: insertError.message };
  }

  // 2. Fetch actor profile name
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", user.id)
    .single();

  const actorName =
    actorProfile?.full_name ||
    actorProfile?.username ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Someone";

  // 3. Find parent review owner & recipe details to send notification
  try {
    const { data: parentReview } = await supabase
      .from("recipe_reviews")
      .select("user_id, recipe_id")
      .eq("id", params.reviewId)
      .single();

    if (parentReview && parentReview.user_id && parentReview.user_id !== user.id) {
      // Find recipe slug or title
      const { data: recipe } = await supabase
        .from("recipes")
        .select("title, slug")
        .eq("id", params.recipeId)
        .single();

      const recipeName = recipe?.title || "a recipe";
      const targetSlug = recipe?.slug || params.recipeId;
      const snippet = commentText.length > 50 ? `${commentText.substring(0, 47)}...` : commentText;

      await createNotificationInternal({
        userId: parentReview.user_id,
        actorId: user.id,
        type: "review_reply",
        title: "New reply to your review",
        message: `${actorName} replied on ${recipeName}: "${snippet}"`,
        link: `/recipe/${targetSlug}#reviews`,
        entityId: params.reviewId,
        metadata: {
          recipeId: params.recipeId,
          reviewId: params.reviewId,
        },
      });
    }
  } catch (notifErr) {
    console.warn("Failed to dispatch review reply notification:", notifErr);
  }

  revalidatePath(`/recipe/${params.recipeId}`);

  return {
    success: true,
    reply: {
      id: inserted.id,
      reviewId: inserted.review_id,
      recipeId: inserted.recipe_id,
      userId: inserted.user_id,
      comment: inserted.comment,
      createdAt: inserted.created_at,
      user: {
        id: user.id,
        fullName: actorProfile?.full_name || user.user_metadata?.full_name,
        username: actorProfile?.username || user.user_metadata?.username,
        avatarUrl: actorProfile?.avatar_url || user.user_metadata?.avatar_url,
      },
    },
  };
}

/**
 * Server Action: Get all replies for a recipe's reviews
 */
export async function getReviewRepliesAction(
  recipeId: string
): Promise<Record<string, ReviewReplyItem[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("review_replies")
    .select(`
      id,
      review_id,
      recipe_id,
      user_id,
      comment,
      created_at,
      profile:user_id (
        id,
        full_name,
        username,
        avatar_url
      )
    `)
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Could not fetch review replies:", error.message);
    return {};
  }

  // Group by review_id
  const grouped: Record<string, ReviewReplyItem[]> = {};

  (data || []).forEach((row: any) => {
    const revId = row.review_id;
    if (!grouped[revId]) {
      grouped[revId] = [];
    }
    grouped[revId].push({
      id: row.id,
      reviewId: row.review_id,
      recipeId: row.recipe_id,
      userId: row.user_id,
      comment: row.comment,
      createdAt: row.created_at,
      user: {
        id: row.profile?.id || row.user_id,
        fullName: row.profile?.full_name,
        username: row.profile?.username,
        avatarUrl: row.profile?.avatar_url,
      },
    });
  });

  return grouped;
}

/**
 * Server Action: Delete a review reply
 */
export async function deleteReviewReplyAction(replyId: string, recipeId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { error } = await supabase
    .from("review_replies")
    .delete()
    .eq("id", replyId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting review reply:", error);
    return { success: false };
  }

  revalidatePath(`/recipe/${recipeId}`);
  return { success: true };
}

