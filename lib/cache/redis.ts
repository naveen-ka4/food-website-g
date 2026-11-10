/**
 * Redis Cache Layer for Hey Garlic
 * Provides distributed caching with automatic invalidation
 */

import { createClient } from "@supabase/supabase-js";

// ==============================================================================
// TYPES
// ==============================================================================

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  staleWhileRevalidate?: number; // Serve stale content while fetching fresh
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

// ==============================================================================
// IN-MEMORY CACHE (Fallback when Redis unavailable)
// ==============================================================================

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = (now - entry.timestamp) / 1000;

    // Check if expired
    if (age > entry.ttl) {
      this.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T = any>(key: string, data: T, options: CacheOptions = {}): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || 3600, // Default 1 hour
      tags: options.tags || [],
    };

    this.cache.set(key, entry);

    // Index by tags
    if (options.tags) {
      for (const tag of options.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from tag index
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
    }
    return this.cache.delete(key);
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        count++;
      }
    }

    this.tagIndex.delete(tag);
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// ==============================================================================
// CACHE MANAGER
// ==============================================================================

class CacheManager {
  private memoryCache: InMemoryCache;
  private redisAvailable: boolean = false;

  constructor() {
    this.memoryCache = new InMemoryCache();
    this.initRedis();

    // Cleanup expired entries every 5 minutes
    if (typeof window === "undefined") {
      setInterval(() => {
        this.memoryCache.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  private async initRedis() {
    // Check if Redis is available (Upstash, Redis Cloud, etc.)
    // For now, we'll use in-memory cache
    // TODO: Add Redis connection when needed for production
    this.redisAvailable = false;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redisAvailable) {
        // TODO: Implement Redis get
        // return await redis.get(key);
      }

      // Fallback to memory cache
      return this.memoryCache.get<T>(key);
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  async set<T = any>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      // Store in Redis if available
      if (this.redisAvailable) {
        // TODO: Implement Redis set
        // await redis.setex(key, options.ttl || 3600, JSON.stringify(data));
      }

      // Always store in memory cache for fast access
      this.memoryCache.set(key, data, options);
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.redisAvailable) {
        // TODO: Implement Redis delete
        // await redis.del(key);
      }

      return this.memoryCache.delete(key);
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      if (this.redisAvailable) {
        // TODO: Implement Redis tag invalidation
      }

      return this.memoryCache.invalidateByTag(tag);
    } catch (error) {
      console.error("Cache invalidate error:", error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.redisAvailable) {
        // TODO: Implement Redis flush
      }

      this.memoryCache.clear();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  getStats() {
    return {
      size: this.memoryCache.size(),
      redisAvailable: this.redisAvailable,
    };
  }
}

// ==============================================================================
// SINGLETON INSTANCE
// ==============================================================================

let cacheInstance: CacheManager | null = null;

export function getCache(): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Cache wrapper for async functions
 */
export async function cached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cache = getCache();

  // Try to get from cache
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  await cache.set(key, data, options);

  return data;
}

/**
 * Invalidate cache by pattern (prefix matching)
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const cache = getCache();
  // For in-memory cache, we use tags instead of pattern matching
  // Use tags when calling cached() to enable proper invalidation
  console.warn(`Pattern invalidation not supported in memory cache. Use tags instead: ${pattern}`);
}

// ==============================================================================
// CACHE KEY GENERATORS
// ==============================================================================

export const CacheKeys = {
  // Recipes
  recipe: (id: string) => `recipe:${id}`,
  recipeBySlug: (slug: string) => `recipe:slug:${slug}`,
  recipes: (filters?: string) => `recipes${filters ? `:${filters}` : ""}`,
  userRecipes: (userId: string, page: number) => `recipes:user:${userId}:${page}`,
  
  // User profiles
  profile: (userId: string) => `profile:${userId}`,
  profileByUsername: (username: string) => `profile:username:${username}`,
  
  // Feed
  feed: (userId: string, page: number) => `feed:${userId}:${page}`,
  feedAnonymous: (page: number) => `feed:anonymous:${page}`,
  
  // Search
  search: (query: string, filters: string) => `search:${query}:${filters}`,
  searchAutocomplete: (query: string) => `search:autocomplete:${query}`,
  searchFacets: (query: string) => `search:facets:${query}`,
  trendingSearches: () => `trending:searches`,
  
  // Social
  followers: (userId: string, page: number) => `followers:${userId}:${page}`,
  following: (userId: string, page: number) => `following:${userId}:${page}`,
  followStatus: (userId: string, targetId: string) => `follow:${userId}:${targetId}`,
  
  // Saved recipes
  savedRecipes: (userId: string) => `saved:${userId}`,
  
  // Trending & Popular
  trendingRecipes: (page: number) => `trending:recipes:${page}`,
  popularRecipes: (page: number) => `popular:recipes:${page}`,
  
  // Categories
  categories: () => `categories`,
  category: (slug: string) => `category:${slug}`,
  categoryRecipes: (slug: string, page: number) => `category:${slug}:recipes:${page}`,
};

// ==============================================================================
// CACHE TAGS (for invalidation)
// ==============================================================================

export const CacheTags = {
  recipe: (id: string) => `recipe:${id}`,
  recipes: () => `recipes`,
  user: (id: string) => `user:${id}`,
  users: () => `users`,
  feed: (userId: string) => `feed:${userId}`,
  search: () => `search`,
  social: (userId: string) => `social:${userId}`,
};

// ==============================================================================
// CACHE TTL CONSTANTS (in seconds)
// ==============================================================================

export const CacheTTL = {
  // Short-lived (1 minute)
  SHORT: 60,
  
  // Medium (5 minutes)
  MEDIUM: 300,
  
  // Standard (15 minutes)
  STANDARD: 900,
  
  // Long (1 hour)
  LONG: 3600,
  
  // Extra long (6 hours)
  EXTRA_LONG: 21600,
  
  // Day
  DAY: 86400,
  
  // Week
  WEEK: 604800,
};
