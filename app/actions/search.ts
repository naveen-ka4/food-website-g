"use server";

/**
 * Enhanced Search & Discovery Server Actions
 * Supports full-text search, faceted filters, autocomplete, and saved searches
 */

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// ==============================================================================
// VALIDATION SCHEMAS
// ==============================================================================

const searchRecipesSchema = z.object({
  query: z.string().max(200).optional(),
  categories: z.array(z.string()).optional(),
  cuisines: z.array(z.string()).optional(),
  mealTypes: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxCookTime: z.number().min(0).max(999).optional(),
  difficulty: z.enum(["Easy", "Medium", "Advanced"]).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const autocompleteSchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(20).default(10),
});

const savedSearchSchema = z.object({
  filterName: z.string().min(1).max(100),
  searchQuery: z.string().max(200).optional(),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    cuisines: z.array(z.string()).optional(),
    mealTypes: z.array(z.string()).optional(),
    dietary: z.array(z.string()).optional(),
    cookingTime: z.string().optional(),
    difficulty: z.string().optional(),
    rating: z.number().optional(),
  }),
  isNotificationEnabled: z.boolean().default(false),
});

const recordSearchSchema = z.object({
  query: z.string().max(200).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  resultsCount: z.number().min(0).default(0),
  sessionId: z.string().optional(),
});

// ==============================================================================
// TYPES
// ==============================================================================

export interface SearchRecipeResult {
  id: string;
  slug: string;
  title: string;
  hero_image: string;
  category: string;
  cuisine: string | null;
  cook_time: number;
  rating: number;
  reviews_count: number;
  view_count: number;
  author_id: string | null;
  author_name: string | null;
  author_username: string | null;
  author_avatar: string | null;
  search_rank: number;
  is_saved: boolean;
}

export interface AutocompleteSuggestion {
  suggestion: string;
  suggestion_type: "recipe" | "category" | "cuisine" | "ingredient" | "tag";
  recipe_id: string | null;
  popularity_score: number;
}

export interface SearchFacet {
  facet_type: string;
  facet_value: string;
  recipe_count: number;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  filter_name: string;
  search_query: string | null;
  filters: Record<string, any>;
  is_notification_enabled: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

export interface TrendingSearch {
  query_text: string;
  unique_searchers: number;
  total_searches: number;
  avg_results: number;
  click_through_rate: number;
  last_searched_at: string;
}

// ==============================================================================
// SEARCH ACTIONS
// ==============================================================================

/**
 * Advanced recipe search with full-text ranking and faceted filters
 */
export async function searchRecipesAction(params: z.infer<typeof searchRecipesSchema>) {
  try {
    const validated = searchRecipesSchema.parse(params);
    const supabase = await createClient();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // Call the database function for advanced search
    const { data, error } = await supabase.rpc("search_recipes_advanced", {
      p_query: validated.query || null,
      p_categories: validated.categories || null,
      p_cuisines: validated.cuisines || null,
      p_meal_types: validated.mealTypes || null,
      p_dietary: validated.dietary || null,
      p_min_rating: validated.minRating || null,
      p_max_cook_time: validated.maxCookTime || null,
      p_difficulty: validated.difficulty || null,
      p_user_id: userId,
      p_limit: validated.limit,
      p_offset: validated.offset,
    });

    if (error) {
      console.error("Search error:", error);
      throw new Error("Failed to search recipes");
    }

    return data as SearchRecipeResult[];
  } catch (error) {
    console.error("searchRecipesAction error:", error);
    throw error;
  }
}

/**
 * Get autocomplete suggestions for search queries
 */
export async function getAutocompleteAction(params: z.infer<typeof autocompleteSchema>) {
  try {
    const validated = autocompleteSchema.parse(params);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_search_autocomplete", {
      p_query: validated.query,
      p_limit: validated.limit,
    });

    if (error) {
      console.error("Autocomplete error:", error);
      return [];
    }

    return data as AutocompleteSuggestion[];
  } catch (error) {
    console.error("getAutocompleteAction error:", error);
    return [];
  }
}

/**
 * Get facet counts for search filters
 */
export async function getSearchFacetsAction(query?: string) {
  try {
    const supabase = await createClient();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { data, error } = await supabase.rpc("get_search_facets", {
      p_query: query || null,
      p_user_id: userId,
    });

    if (error) {
      console.error("Facets error:", error);
      return [];
    }

    return data as SearchFacet[];
  } catch (error) {
    console.error("getSearchFacetsAction error:", error);
    return [];
  }
}

/**
 * Record a search query for analytics
 */
export async function recordSearchAction(params: z.infer<typeof recordSearchSchema>) {
  try {
    const validated = recordSearchSchema.parse(params);
    const supabase = await createClient();

    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { data, error } = await supabase.rpc("record_search", {
      p_user_id: userId,
      p_session_id: validated.sessionId || null,
      p_query: validated.query || null,
      p_filters: validated.filters || {},
      p_results_count: validated.resultsCount,
    });

    if (error) {
      console.error("Record search error:", error);
    }

    return data as string; // Returns search ID
  } catch (error) {
    console.error("recordSearchAction error:", error);
    return null;
  }
}

/**
 * Get trending search queries
 */
export async function getTrendingSearchesAction(limit: number = 10) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("trending_searches")
      .select("*")
      .order("total_searches", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Trending searches error:", error);
      return [];
    }

    return data as TrendingSearch[];
  } catch (error) {
    console.error("getTrendingSearchesAction error:", error);
    return [];
  }
}

// ==============================================================================
// SAVED SEARCH ACTIONS
// ==============================================================================

/**
 * Save a search filter for quick access
 */
export async function saveSearchFilterAction(params: z.infer<typeof savedSearchSchema>) {
  try {
    const validated = savedSearchSchema.parse(params);
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        filter_name: validated.filterName,
        search_query: validated.searchQuery || null,
        filters: validated.filters,
        is_notification_enabled: validated.isNotificationEnabled,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("A saved search with this name already exists");
      }
      throw new Error("Failed to save search filter");
    }

    return data as SavedSearch;
  } catch (error) {
    console.error("saveSearchFilterAction error:", error);
    throw error;
  }
}

/**
 * Get user's saved search filters
 */
export async function getSavedSearchesAction() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("last_used_at", { ascending: false });

    if (error) {
      console.error("Get saved searches error:", error);
      return [];
    }

    return data as SavedSearch[];
  } catch (error) {
    console.error("getSavedSearchesAction error:", error);
    return [];
  }
}

/**
 * Update a saved search filter
 */
export async function updateSavedSearchAction(
  searchId: string,
  updates: Partial<z.infer<typeof savedSearchSchema>>
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { data, error } = await supabase
      .from("saved_searches")
      .update({
        filter_name: updates.filterName,
        search_query: updates.searchQuery,
        filters: updates.filters,
        is_notification_enabled: updates.isNotificationEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", searchId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error("Failed to update saved search");
    }

    return data as SavedSearch;
  } catch (error) {
    console.error("updateSavedSearchAction error:", error);
    throw error;
  }
}

/**
 * Delete a saved search filter
 */
export async function deleteSavedSearchAction(searchId: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", searchId)
      .eq("user_id", user.id);

    if (error) {
      throw new Error("Failed to delete saved search");
    }

    return true;
  } catch (error) {
    console.error("deleteSavedSearchAction error:", error);
    throw error;
  }
}

/**
 * Update last_used_at for a saved search (when user clicks it)
 */
export async function useSavedSearchAction(searchId: string) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required");
    }

    const { error } = await supabase
      .from("saved_searches")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", searchId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Use saved search error:", error);
    }

    return true;
  } catch (error) {
    console.error("useSavedSearchAction error:", error);
    return false;
  }
}

/**
 * Get user's recent search history
 */
export async function getSearchHistoryAction(limit: number = 20) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return [];
    }

    const { data, error } = await supabase
      .from("search_history")
      .select("*")
      .eq("user_id", user.id)
      .order("searched_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Get search history error:", error);
      return [];
    }

    return data;
  } catch (error) {
    console.error("getSearchHistoryAction error:", error);
    return [];
  }
}
