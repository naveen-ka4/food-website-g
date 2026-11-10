/**
 * Feed Generation Algorithm with Collaborative Filtering
 * Generates personalized recipe feeds based on user behavior and social graph
 */

import { createClient } from "@/lib/supabase/server";

export interface FeedRecipe {
  id: string;
  slug: string;
  title: string;
  hero_image: string | null;
  category: string;
  cook_time: number;
  rating: number;
  reviews_count: number;
  popularity_score: number;
  view_count: number;
  save_count: number;
  created_at: string;
  user_id: string;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  feed_score: number; // Composite score for feed ranking
  feed_reason?: string; // Why this recipe is in the feed
}

interface UserPreferences {
  favoriteCategories: string[];
  favoriteCuisines: string[];
  averageCookTime: number;
  dietaryPreferences: string[];
}

/**
 * Calculate user similarity based on common interactions
 */
async function calculateUserSimilarity(userId: string, otherUserId: string): Promise<number> {
  const supabase = await createClient();

  // Get common saved recipes
  const { data: userSaves } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", userId);

  const { data: otherSaves } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", otherUserId);

  const userRecipeIds = new Set(userSaves?.map((s) => s.recipe_id) || []);
  const otherRecipeIds = new Set(otherSaves?.map((s) => s.recipe_id) || []);

  // Calculate Jaccard similarity
  const intersection = new Set([...userRecipeIds].filter((id) => otherRecipeIds.has(id)));
  const union = new Set([...userRecipeIds, ...otherRecipeIds]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Get user preferences based on their interaction history
 */
async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const supabase = await createClient();

  // Get user's saved recipes to infer preferences
  const { data: savedRecipes } = await supabase
    .from("saved_recipes")
    .select(
      `
      recipe_id,
      recipes!inner (
        category,
        cuisine,
        cook_time,
        dietary_tag
      )
    `
    )
    .eq("user_id", userId)
    .limit(50);

  if (!savedRecipes || savedRecipes.length === 0) {
    return {
      favoriteCategories: [],
      favoriteCuisines: [],
      averageCookTime: 30,
      dietaryPreferences: [],
    };
  }

  // Count categories
  const categoryCount = new Map<string, number>();
  const cuisineCount = new Map<string, number>();
  const dietaryTags = new Set<string>();
  let totalCookTime = 0;
  let cookTimeCount = 0;

  savedRecipes.forEach((saved: any) => {
    const recipe = saved.recipes;
    if (!recipe) return;

    if (recipe.category) {
      categoryCount.set(recipe.category, (categoryCount.get(recipe.category) || 0) + 1);
    }

    if (recipe.cuisine) {
      cuisineCount.set(recipe.cuisine, (cuisineCount.get(recipe.cuisine) || 0) + 1);
    }

    if (recipe.dietary_tag) {
      dietaryTags.add(recipe.dietary_tag);
    }

    if (recipe.cook_time) {
      totalCookTime += recipe.cook_time;
      cookTimeCount++;
    }
  });

  // Sort by frequency and take top preferences
  const favoriteCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);

  const favoriteCuisines = Array.from(cuisineCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine);

  return {
    favoriteCategories,
    favoriteCuisines,
    averageCookTime: cookTimeCount > 0 ? totalCookTime / cookTimeCount : 30,
    dietaryPreferences: Array.from(dietaryTags),
  };
}

/**
 * Get recipes from users that current user follows
 */
async function getFollowingRecipes(userId: string, limit: number = 20): Promise<FeedRecipe[]> {
  const supabase = await createClient();

  const { data: followRows } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = followRows?.map((f: any) => f.following_id) || [];
  if (followingIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(
      `
      id,
      slug,
      title,
      hero_image,
      category,
      cook_time,
      rating,
      reviews_count,
      popularity_score,
      view_count,
      save_count,
      created_at,
      user_id,
      profiles!recipes_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq("is_published", true)
    .eq("visibility", "public")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((recipe) => {
    const author = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles;
    return {
      ...recipe,
      author: {
        id: author?.id || recipe.user_id,
        username: author?.username || "anonymous",
        full_name: author?.full_name || "Anonymous Chef",
        avatar_url: author?.avatar_url || null,
      },
      feed_score: recipe.popularity_score || 0,
      feed_reason: "from_following",
    };
  });
}

/**
 * Get trending recipes based on recent engagement
 */
async function getTrendingRecipes(limit: number = 10): Promise<FeedRecipe[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trending_recipes")
    .select(
      `
      id,
      slug,
      title,
      hero_image,
      category,
      cook_time,
      rating,
      reviews_count,
      popularity_score,
      view_count,
      save_count,
      recent_views,
      trending_score
    `
    )
    .order("trending_score", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Get author info for each recipe
  const recipeIds = data.map((r) => r.id);
  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      `
      id,
      created_at,
      user_id,
      profiles!recipes_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .in("id", recipeIds);

  const recipeMap = new Map(recipes?.map((r) => [r.id, r]) || []);

  return data.map((recipe) => {
    const fullRecipe = recipeMap.get(recipe.id);
    const author = fullRecipe?.profiles
      ? Array.isArray(fullRecipe.profiles)
        ? fullRecipe.profiles[0]
        : fullRecipe.profiles
      : null;

    return {
      ...recipe,
      created_at: fullRecipe?.created_at || new Date().toISOString(),
      user_id: fullRecipe?.user_id || "",
      author: {
        id: author?.id || fullRecipe?.user_id || "",
        username: author?.username || "anonymous",
        full_name: author?.full_name || "Anonymous Chef",
        avatar_url: author?.avatar_url || null,
      },
      feed_score: recipe.trending_score || recipe.popularity_score || 0,
      feed_reason: "trending",
    };
  });
}

/**
 * Get personalized recommendations based on collaborative filtering
 */
async function getCollaborativeRecommendations(
  userId: string,
  preferences: UserPreferences,
  limit: number = 15
): Promise<FeedRecipe[]> {
  const supabase = await createClient();

  // Find users with similar tastes (who saved similar recipes)
  const { data: userSaves } = await supabase
    .from("saved_recipes")
    .select("recipe_id")
    .eq("user_id", userId)
    .limit(50);

  const savedRecipeIds = userSaves?.map((s) => s.recipe_id) || [];

  if (savedRecipeIds.length === 0) {
    // New user - return popular recipes in their preferred categories
    return getPopularInCategories(preferences.favoriteCategories, limit);
  }

  // Find other users who saved the same recipes
  const { data: similarUserSaves } = await supabase
    .from("saved_recipes")
    .select("user_id, recipe_id")
    .in("recipe_id", savedRecipeIds)
    .neq("user_id", userId)
    .limit(200);

  if (!similarUserSaves || similarUserSaves.length === 0) {
    return [];
  }

  // Count how many common saves each user has
  const userSaveCount = new Map<string, number>();
  similarUserSaves.forEach((save) => {
    userSaveCount.set(save.user_id, (userSaveCount.get(save.user_id) || 0) + 1);
  });

  // Get recipes saved by similar users that current user hasn't saved
  const similarUserIds = Array.from(userSaveCount.keys()).slice(0, 20);

  const { data: recommendations } = await supabase
    .from("saved_recipes")
    .select(
      `
      recipe_id,
      recipes!inner (
        id,
        slug,
        title,
        hero_image,
        category,
        cook_time,
        rating,
        reviews_count,
        popularity_score,
        view_count,
        save_count,
        created_at,
        user_id,
        is_published,
        visibility,
        profiles!recipes_user_id_fkey (
          id,
          username,
          full_name,
          avatar_url
        )
      )
    `
    )
    .in("user_id", similarUserIds)
    .not("recipe_id", "in", `(${savedRecipeIds.join(",")})`)
    .limit(limit * 2);

  if (!recommendations) {
    return [];
  }

  // Score and rank recommendations
  const scoredRecipes = recommendations
    .map((rec: any) => {
      const recipe = rec.recipes;
      if (!recipe || !recipe.is_published || recipe.visibility !== "public") {
        return null;
      }

      const author = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles;

      // Calculate recommendation score
      let score = recipe.popularity_score || 0;

      // Boost if in favorite categories
      if (preferences.favoriteCategories.includes(recipe.category)) {
        score *= 1.5;
      }

      // Boost if similar cook time
      const cookTimeDiff = Math.abs(recipe.cook_time - preferences.averageCookTime);
      if (cookTimeDiff < 15) {
        score *= 1.2;
      }

      return {
        ...recipe,
        author: {
          id: author?.id || recipe.user_id,
          username: author?.username || "anonymous",
          full_name: author?.full_name || "Anonymous Chef",
          avatar_url: author?.avatar_url || null,
        },
        feed_score: score,
        feed_reason: "recommended",
      };
    })
    .filter(Boolean) as FeedRecipe[];

  // Sort by score and return top results
  return scoredRecipes.sort((a, b) => b.feed_score - a.feed_score).slice(0, limit);
}

/**
 * Get popular recipes in specific categories
 */
async function getPopularInCategories(
  categories: string[],
  limit: number = 15
): Promise<FeedRecipe[]> {
  const supabase = await createClient();

  const query = supabase
    .from("recipes")
    .select(
      `
      id,
      slug,
      title,
      hero_image,
      category,
      cook_time,
      rating,
      reviews_count,
      popularity_score,
      view_count,
      save_count,
      created_at,
      user_id,
      profiles!recipes_user_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq("is_published", true)
    .eq("visibility", "public")
    .order("popularity_score", { ascending: false })
    .limit(limit);

  if (categories.length > 0) {
    query.in("category", categories);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((recipe) => {
    const author = Array.isArray(recipe.profiles) ? recipe.profiles[0] : recipe.profiles;
    return {
      ...recipe,
      author: {
        id: author?.id || recipe.user_id,
        username: author?.username || "anonymous",
        full_name: author?.full_name || "Anonymous Chef",
        avatar_url: author?.avatar_url || null,
      },
      feed_score: recipe.popularity_score || 0,
      feed_reason: "popular",
    };
  });
}

/**
 * Generate personalized feed with smart mixing algorithm
 * - 60% from followed users
 * - 30% trending
 * - 10% collaborative recommendations
 */
export async function generatePersonalizedFeed(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<FeedRecipe[]> {
  const preferences = await getUserPreferences(userId);

  // Calculate how many recipes from each source
  const followingCount = Math.floor(limit * 0.6);
  const trendingCount = Math.floor(limit * 0.3);
  const recommendedCount = limit - followingCount - trendingCount;

  // Fetch from all sources in parallel
  const [followingRecipes, trendingRecipes, recommendedRecipes] = await Promise.all([
    getFollowingRecipes(userId, followingCount * 2), // Get more to account for filtering
    getTrendingRecipes(trendingCount),
    getCollaborativeRecommendations(userId, preferences, recommendedCount * 2),
  ]);

  // Combine and deduplicate
  const seenIds = new Set<string>();
  const feed: FeedRecipe[] = [];

  // Add from following (priority)
  followingRecipes.slice(0, followingCount).forEach((recipe) => {
    if (!seenIds.has(recipe.id)) {
      feed.push(recipe);
      seenIds.add(recipe.id);
    }
  });

  // Add trending
  trendingRecipes.slice(0, trendingCount).forEach((recipe) => {
    if (!seenIds.has(recipe.id)) {
      feed.push(recipe);
      seenIds.add(recipe.id);
    }
  });

  // Add recommendations
  recommendedRecipes.slice(0, recommendedCount).forEach((recipe) => {
    if (!seenIds.has(recipe.id)) {
      feed.push(recipe);
      seenIds.add(recipe.id);
    }
  });

  // If we don't have enough recipes, fill with popular
  if (feed.length < limit) {
    const popularRecipes = await getPopularInCategories(preferences.favoriteCategories, limit - feed.length);
    popularRecipes.forEach((recipe) => {
      if (!seenIds.has(recipe.id)) {
        feed.push(recipe);
        seenIds.add(recipe.id);
      }
    });
  }

  // Sort by feed score and apply pagination
  const sorted = feed.sort((a, b) => b.feed_score - a.feed_score);
  const offset = (page - 1) * limit;
  return sorted.slice(offset, offset + limit);
}

/**
 * Generate feed for anonymous users (trending + popular)
 */
export async function generateAnonymousFeed(page: number = 1, limit: number = 20): Promise<FeedRecipe[]> {
  const trendingCount = Math.floor(limit * 0.7);
  const popularCount = limit - trendingCount;

  const [trendingRecipes, popularRecipes] = await Promise.all([
    getTrendingRecipes(trendingCount),
    getPopularInCategories([], popularCount),
  ]);

  const feed = [...trendingRecipes, ...popularRecipes];
  const offset = (page - 1) * limit;
  return feed.slice(offset, offset + limit);
}
