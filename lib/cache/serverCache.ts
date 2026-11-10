/**
 * Server-Side Caching using Next.js Cache APIs
 * Provides React cache() and unstable_cache() wrappers with automatic revalidation
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";

// ==============================================================================
// CACHE CONFIGURATION
// ==============================================================================

export const CACHE_TAGS = {
  recipes: "recipes",
  recipe: (id: string) => `recipe-${id}`,
  user: (id: string) => `user-${id}`,
  profiles: "profiles",
  feed: "feed",
  search: "search",
  categories: "categories",
  trending: "trending",
  notifications: "notifications",
} as const;

export const REVALIDATE_TIMES = {
  // Never revalidate (static)
  NEVER: false,

  // 1 minute (real-time data)
  REALTIME: 60,

  // 5 minutes (frequently changing)
  FREQUENT: 300,

  // 15 minutes (standard)
  STANDARD: 900,

  // 1 hour (stable data)
  STABLE: 3600,

  // 1 day (rarely changing)
  DAILY: 86400,
} as const;

// ==============================================================================
// REACT CACHE WRAPPERS
// ==============================================================================

/**
 * Cache function for React Server Components (request-scoped)
 * Deduplicates requests during a single render
 */
export function createRequestCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return cache(fn);
}

// ==============================================================================
// UNSTABLE_CACHE WRAPPERS (Data Cache)
// ==============================================================================

/**
 * Cache function with automatic revalidation
 * Persists across requests and deployments
 */
export function createDataCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyPrefix: string;
    tags?: string[];
    revalidate?: number | false;
  }
): T {
  const { keyPrefix, tags = [], revalidate = REVALIDATE_TIMES.STANDARD } = options;

  return ((...args: Parameters<T>) => {
    const cacheKey = `${keyPrefix}-${JSON.stringify(args)}`;

    return unstable_cache(
      async () => {
        return await fn(...args);
      },
      [cacheKey],
      {
        tags,
        revalidate,
      }
    )();
  }) as T;
}

// ==============================================================================
// SPECIALIZED CACHE FUNCTIONS
// ==============================================================================

/**
 * Cache recipe data
 */
export function cacheRecipe<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  recipeIdGetter: (...args: Parameters<T>) => string
) {
  return createDataCache(fn, {
    keyPrefix: "recipe",
    tags: [CACHE_TAGS.recipes],
    revalidate: REVALIDATE_TIMES.STANDARD,
  });
}

/**
 * Cache user profile data
 */
export function cacheProfile<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  userIdGetter: (...args: Parameters<T>) => string
) {
  return createDataCache(fn, {
    keyPrefix: "profile",
    tags: [CACHE_TAGS.profiles],
    revalidate: REVALIDATE_TIMES.FREQUENT,
  });
}

/**
 * Cache search results
 */
export function cacheSearch<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return createDataCache(fn, {
    keyPrefix: "search",
    tags: [CACHE_TAGS.search],
    revalidate: REVALIDATE_TIMES.FREQUENT,
  });
}

/**
 * Cache feed data
 */
export function cacheFeed<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return createDataCache(fn, {
    keyPrefix: "feed",
    tags: [CACHE_TAGS.feed],
    revalidate: REVALIDATE_TIMES.FREQUENT,
  });
}

/**
 * Cache category data
 */
export function cacheCategories<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return createDataCache(fn, {
    keyPrefix: "categories",
    tags: [CACHE_TAGS.categories],
    revalidate: REVALIDATE_TIMES.STABLE,
  });
}

/**
 * Cache trending data
 */
export function cacheTrending<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return createDataCache(fn, {
    keyPrefix: "trending",
    tags: [CACHE_TAGS.trending],
    revalidate: REVALIDATE_TIMES.FREQUENT,
  });
}

// ==============================================================================
// CACHE INVALIDATION
// ==============================================================================

/**
 * Revalidate cache by tag
 * Use this after mutations to invalidate stale data
 */
export async function revalidateCache(tag: string) {
  const { revalidateTag } = await import("next/cache");
  (revalidateTag as any)(tag);
}

/**
 * Revalidate path
 * Use this to revalidate specific routes
 */
export async function revalidateCachePath(path: string, type: "page" | "layout" = "page") {
  const { revalidatePath } = await import("next/cache");
  revalidatePath(path, type);
}

/**
 * Revalidate multiple tags
 */
export async function revalidateCacheTags(tags: string[]) {
  for (const tag of tags) {
    await revalidateCache(tag);
  }
}

// ==============================================================================
// CACHE HELPERS
// ==============================================================================

/**
 * Invalidate recipe-related caches
 */
export async function invalidateRecipeCache(recipeId: string) {
  await revalidateCache(CACHE_TAGS.recipe(recipeId));
  await revalidateCache(CACHE_TAGS.recipes);
  await revalidateCache(CACHE_TAGS.feed);
  await revalidateCache(CACHE_TAGS.trending);
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(userId: string) {
  await revalidateCache(CACHE_TAGS.user(userId));
  await revalidateCache(CACHE_TAGS.profiles);
  await revalidateCache(CACHE_TAGS.feed);
}

/**
 * Invalidate search cache
 */
export async function invalidateSearchCache() {
  await revalidateCache(CACHE_TAGS.search);
}

/**
 * Invalidate all caches (use sparingly!)
 */
export async function invalidateAllCaches() {
  await revalidateCacheTags([
    CACHE_TAGS.recipes,
    CACHE_TAGS.profiles,
    CACHE_TAGS.feed,
    CACHE_TAGS.search,
    CACHE_TAGS.categories,
    CACHE_TAGS.trending,
    CACHE_TAGS.notifications,
  ]);
}

// ==============================================================================
// EXAMPLE USAGE
// ==============================================================================

/*
// Example 1: Cache a recipe fetching function
export const getCachedRecipe = cacheRecipe(
  async (id: string) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();
    return data;
  },
  (id) => id
);

// Example 2: Request-scoped cache (deduplication)
export const getRecipeOnce = createRequestCache(
  async (id: string) => {
    // This will only be called once per request,
    // even if used multiple times in different components
    return await fetchRecipe(id);
  }
);

// Example 3: Manual cache control
import { revalidateTag } from "next/cache";

export async function updateRecipe(id: string, data: any) {
  // Update in database
  await supabase.from("recipes").update(data).eq("id", id);
  
  // Invalidate caches
  await invalidateRecipeCache(id);
}
*/
