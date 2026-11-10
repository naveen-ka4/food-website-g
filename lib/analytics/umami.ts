/**
 * Umami Custom Event Tracking Utility
 * Safely dispatches events to window.umami if available in client runtime.
 */

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, any>) => void;
      identify: (data: Record<string, any>) => void;
    };
  }
}

/**
 * Dispatches a generic custom event to Umami.
 */
export function trackUmamiEvent(eventName: string, eventData?: Record<string, any>): void {
  if (typeof window === "undefined") return;

  try {
    if (window.umami && typeof window.umami.track === "function") {
      window.umami.track(eventName, eventData);
    }
  } catch (err) {
    // Fail silently in case analytics script is blocked by browser ad blocker
  }
}

/**
 * Tracks when a user views a recipe page.
 */
export function trackRecipeView(recipe: {
  id: string;
  title: string;
  category?: string;
  cookTime?: number;
}): void {
  trackUmamiEvent("recipe_view", {
    recipe_id: recipe.id,
    recipe_title: recipe.title,
    category: recipe.category || "General",
    cook_time: recipe.cookTime || 0,
  });
}

/**
 * Tracks when a user searches for recipes.
 */
export function trackRecipeSearch(query: string, resultsCount?: number): void {
  const trimmed = query.trim();
  if (!trimmed) return;

  trackUmamiEvent("search", {
    query: trimmed,
    results_count: resultsCount ?? 0,
  });
}

/**
 * Tracks when a user starts Cooking Mode on a recipe.
 */
export function trackCookingModeStart(recipeId: string, recipeTitle: string): void {
  trackUmamiEvent("start_cooking_mode", {
    recipe_id: recipeId,
    recipe_title: recipeTitle,
  });
}

/**
 * Tracks when a user saves / bookmarks a recipe.
 */
export function trackRecipeSave(recipeId: string, recipeTitle: string): void {
  trackUmamiEvent("save_recipe", {
    recipe_id: recipeId,
    recipe_title: recipeTitle,
  });
}

/**
 * Tracks when a user shares a recipe.
 */
export function trackRecipeShare(recipeId: string, platform?: string): void {
  trackUmamiEvent("share_recipe", {
    recipe_id: recipeId,
    platform: platform || "copy_link",
  });
}

