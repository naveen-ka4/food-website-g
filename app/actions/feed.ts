"use server";

/**
 * Server Actions for Personalized Feed
 * Handles feed generation and pagination
 */

import { createClient } from "@/lib/supabase/server";
import { generatePersonalizedFeed, generateAnonymousFeed } from "@/lib/algorithms/feedGenerator";
import { withErrorHandling, assertAuthenticated } from "@/lib/errors/handlers";
import { withRateLimitAction } from "@/lib/security/rateLimit";

interface FeedRecipe {
  id: string;
  slug: string;
  title: string;
  hero_image: string | null;
  category: string;
  cook_time: number;
  rating: number;
  reviews_count: number;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  feed_score: number;
  feed_reason?: string;
}

interface FeedResult {
  success: boolean;
  recipes?: FeedRecipe[];
  error?: string;
  page?: number;
  hasMore?: boolean;
}

/**
 * Get personalized feed for authenticated user
 */
export const getFeedRecipesAction = withRateLimitAction(
  "api_general",
  withErrorHandling(async (page: number = 1, limit: number = 20): Promise<FeedResult> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user?.id, "You must be logged in to view your feed");

    const recipes = await generatePersonalizedFeed(user.id, page, limit);

    return {
      success: true,
      recipes,
      page,
      hasMore: recipes.length === limit,
    };
  }, "getFeedRecipesAction")
);

/**
 * Get anonymous feed (trending + popular recipes)
 */
export const getAnonymousFeedAction = withErrorHandling(
  async (page: number = 1, limit: number = 20): Promise<FeedResult> => {
    const recipes = await generateAnonymousFeed(page, limit);

    return {
      success: true,
      recipes,
      page,
      hasMore: recipes.length === limit,
    };
  },
  "getAnonymousFeedAction"
);

/**
 * Record recipe view for engagement tracking
 */
export const recordRecipeViewAction = withErrorHandling(
  async (recipeId: string, viewDuration?: number): Promise<{ success: boolean }> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Create session ID for anonymous users
    const sessionId = !user
      ? `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : undefined;

    const { error } = await supabase.from("recipe_views").insert({
      user_id: user?.id || null,
      recipe_id: recipeId,
      view_duration: viewDuration || null,
      session_id: sessionId,
      viewed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error recording recipe view:", error);
      return { success: false };
    }

    // Also record in user_interactions for authenticated users
    if (user) {
      await supabase.from("user_interactions").upsert(
        {
          user_id: user.id,
          recipe_id: recipeId,
          interaction_type: "view",
          interaction_score: 1.0,
          metadata: { view_duration: viewDuration || 0 },
        },
        {
          onConflict: "user_id,recipe_id,interaction_type",
        }
      );
    }

    return { success: true };
  },
  "recordRecipeViewAction"
);

/**
 * Get recipe recommendations for user
 */
export const getRecommendedRecipesAction = withRateLimitAction(
  "api_general",
  withErrorHandling(async (limit: number = 12): Promise<FeedResult> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Return trending recipes for anonymous users
      const recipes = await generateAnonymousFeed(1, limit);
      return {
        success: true,
        recipes,
      };
    }

    // Generate recommendations using collaborative filtering
    const recipes = await generatePersonalizedFeed(user.id, 1, limit);

    // Filter to only recommendations (not from following)
    const recommendedOnly = recipes.filter(
      (r) => r.feed_reason === "recommended" || r.feed_reason === "popular"
    );

    return {
      success: true,
      recipes: recommendedOnly.slice(0, limit),
    };
  }, "getRecommendedRecipesAction")
);
