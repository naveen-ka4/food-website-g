import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  trackUmamiEvent,
  trackRecipeView,
  trackRecipeSearch,
  trackCookingModeStart,
  trackRecipeSave,
  trackRecipeShare,
} from "@/lib/analytics/umami";

describe("Umami Analytics Helper", () => {
  let mockTrack: any;

  beforeEach(() => {
    mockTrack = vi.fn();
    (global as any).window = {
      umami: {
        track: mockTrack,
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("safely dispatches a generic event when window.umami is present", () => {
    trackUmamiEvent("custom_click", { button_id: "test-btn" });
    expect(mockTrack).toHaveBeenCalledWith("custom_click", { button_id: "test-btn" });
  });

  it("dispatches recipe_view event with correct payload", () => {
    trackRecipeView({
      id: "rec-123",
      title: "Garlic Butter Rice",
      category: "Rice",
      cookTime: 15,
    });

    expect(mockTrack).toHaveBeenCalledWith("recipe_view", {
      recipe_id: "rec-123",
      recipe_title: "Garlic Butter Rice",
      category: "Rice",
      cook_time: 15,
    });
  });

  it("dispatches search event with trimmed query and results count", () => {
    trackRecipeSearch("  garlic pasta  ", 8);
    expect(mockTrack).toHaveBeenCalledWith("search", {
      query: "garlic pasta",
      results_count: 8,
    });
  });

  it("ignores search tracking if query is empty", () => {
    trackRecipeSearch("   ");
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("dispatches start_cooking_mode event", () => {
    trackCookingModeStart("rec-456", "Chicken Curry");
    expect(mockTrack).toHaveBeenCalledWith("start_cooking_mode", {
      recipe_id: "rec-456",
      recipe_title: "Chicken Curry",
    });
  });

  it("dispatches save_recipe event", () => {
    trackRecipeSave("rec-789", "Chocolate Cake");
    expect(mockTrack).toHaveBeenCalledWith("save_recipe", {
      recipe_id: "rec-789",
      recipe_title: "Chocolate Cake",
    });
  });

  it("dispatches share_recipe event", () => {
    trackRecipeShare("rec-789", "whatsapp");
    expect(mockTrack).toHaveBeenCalledWith("share_recipe", {
      recipe_id: "rec-789",
      platform: "whatsapp",
    });
  });

  it("fails silently without throwing when window.umami is undefined", () => {
    (global as any).window = {};
    expect(() => trackUmamiEvent("any_event")).not.toThrow();
  });
});

