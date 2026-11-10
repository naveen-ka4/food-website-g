import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runHeuristicModerator,
  analyzeRecipeWithAi,
  analyzeImageWithAi,
  analyzeReviewWithAi,
  getActiveAiProviderInfo,
  type RecipeInputForAi,
} from "../../lib/ai/moderator";

describe("AI Moderation Engine (Heuristic Fallback)", () => {
  it("flags recipe with no ingredients or instructions", () => {
    const emptyRecipe: RecipeInputForAi = {
      title: "Garlic",
      ingredients: [],
      instructions: [],
    };

    const result = runHeuristicModerator(emptyRecipe);
    expect(result.is_safe).toBe(false);
    expect(result.confidence_score).toBeLessThan(0.7);
    expect(result.issues).toContain("No ingredients listed in recipe");
    expect(result.issues).toContain("Missing cooking instruction steps");
  });

  it("identifies missing measurements when ingredients lack amounts", () => {
    const vagueRecipe: RecipeInputForAi = {
      title: "Mystery Soup",
      ingredients: [
        { name: "Carrots", amount: "" },
        { name: "Potatoes", amount: "" },
        { name: "Water", amount: "" },
      ],
      instructions: [
        { stepNumber: 1, description: "Boil all ingredients in water for thirty minutes and enjoy hot." },
      ],
      prep_time: 10,
      cook_time: 30,
    };

    const result = runHeuristicModerator(vagueRecipe);
    expect(result.issues.some((issue: string) => issue.includes("Measurements missing"))).toBe(true);
  });

  it("detects spam keywords and severely drops confidence score", () => {
    const spamRecipe: RecipeInputForAi = {
      title: "Delicious Pasta with https://free-crypto-casino.com",
      description: "Visit our casino to win free money while cooking pasta!",
      ingredients: [{ name: "Pasta", amount: 200, unit: "g" }],
      instructions: [{ stepNumber: 1, description: "Click our link and register now." }],
    };

    const result = runHeuristicModerator(spamRecipe);
    expect(result.is_safe).toBe(false);
    expect(result.confidence_score).toBeLessThanOrEqual(0.2);
    expect(result.issues.some((i: string) => i.includes("spam/unrelated link"))).toBe(true);
  });

  it("approves well-formed recipes and suggests appropriate tags", () => {
    const validRecipe: RecipeInputForAi = {
      title: "Sri Lankan Spicy Garlic Chicken Curry",
      description: "A fragrant, authentic homemade coconut milk chicken curry.",
      category: "Dinner",
      meal_type: "Curry",
      prep_time: 10,
      cook_time: 20,
      default_servings: 4,
      ingredients: [
        { name: "Chicken breast", amount: 500, unit: "g" },
        { name: "Garlic cloves", amount: 6, unit: "pieces" },
        { name: "Coconut milk", amount: 200, unit: "ml" },
        { name: "Curry powder", amount: 1, unit: "tbsp" },
        { name: "Chili powder", amount: 1, unit: "tsp" },
      ],
      instructions: [
        { stepNumber: 1, description: "Heat oil in a pan, sauté minced garlic and curry powder until fragrant." },
        { stepNumber: 2, description: "Add chicken cubes and cook until browned on all sides." },
        { stepNumber: 3, description: "Pour in rich coconut milk and simmer gently on medium heat for 15 minutes." },
      ],
    };

    const result = runHeuristicModerator(validRecipe);
    expect(result.is_safe).toBe(true);
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.9);
    expect(result.issues).toHaveLength(0);
    expect(result.suggested_tags).toContain("Sri Lankan");
    expect(result.suggested_tags).toContain("Spicy");
    expect(result.suggested_tags).toContain("Garlic Lover");
    expect(result.suggested_tags).toContain("Quick & Easy");
  });
});

describe("OpenRouter AI Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("identifies OpenRouter as active provider when OPENROUTER_API_KEY is present", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";
    process.env.OPENROUTER_MODEL = "google/gemini-2.0-flash-exp:free";

    const info = getActiveAiProviderInfo();
    expect(info.provider).toBe("OpenRouter");
    expect(info.model).toBe("google/gemini-2.0-flash-exp:free");
  });

  it("calls OpenRouter API and parses compact JSON response correctly", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";
    process.env.OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

    const mockAiResponse = {
      is_safe: true,
      confidence_score: 0.98,
      issues: [],
      suggested_tags: ["Curry", "Healthy", "Quick"],
      summary: "Safe, authentic dish with clear ingredients.",
    };

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", globalFetch);

    const recipe: RecipeInputForAi = {
      title: "Garlic Butter Naan",
      ingredients: [{ name: "Flour", amount: 2, unit: "cups" }],
      instructions: [{ stepNumber: 1, description: "Knead dough and bake on a hot tawa with garlic butter." }],
    };

    const result = await analyzeRecipeWithAi(recipe);

    expect(globalFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-or-test-key-123",
        }),
      })
    );

    expect(result.is_safe).toBe(true);
    expect(result.confidence_score).toBe(0.98);
    expect(result.provider).toBe("OpenRouter");
    expect(result.model).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(result.suggested_tags).toContain("Curry");
  });

  it("throws clear error if OpenRouter API fails without masking as demo data", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";

    const globalFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded on OpenRouter",
    });
    vi.stubGlobal("fetch", globalFetch);

    const recipe: RecipeInputForAi = {
      title: "Garlic Bread",
      ingredients: [{ name: "Baguette", amount: 1, unit: "loaf" }],
      instructions: [{ stepNumber: 1, description: "Bake in oven for fifteen minutes until golden brown." }],
      prep_time: 5,
      cook_time: 15,
    };

    await expect(analyzeRecipeWithAi(recipe)).rejects.toThrow("OpenRouter API error (429)");
  });

  it("strictly uses heuristic rules only when no AI keys are present", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_API_KEY;

    const recipe: RecipeInputForAi = {
      title: "Garlic Bread",
      ingredients: [{ name: "Baguette", amount: 1, unit: "loaf" }],
      instructions: [{ stepNumber: 1, description: "Bake in oven for fifteen minutes until golden brown." }],
    };

    const result = await analyzeRecipeWithAi(recipe);
    expect(result.provider).toBe("Built-in Heuristic");
    expect(result.is_safe).toBe(true);
  });

  it("uses universal AI_MODEL from .env if specific model is not provided", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";
    delete process.env.OPENROUTER_MODEL;
    process.env.AI_MODEL = "stealth/crouton-alpha";

    const info = getActiveAiProviderInfo();
    expect(info.provider).toBe("OpenRouter");
    expect(info.model).toBe("stealth/crouton-alpha");
  });

  it("uses GEMINI_MODEL dynamically from .env when Gemini is active", () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-1.5-pro";

    const info = getActiveAiProviderInfo();
    expect(info.provider).toBe("Google Gemini");
    expect(info.model).toBe("gemini-1.5-pro");
  });

  it("respects AI_PROVIDER override in .env when both keys exist", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    process.env.AI_PROVIDER = "gemini";

    const info = getActiveAiProviderInfo();
    expect(info.provider).toBe("Google Gemini");
    expect(info.model).toBe("gemini-2.0-flash");
  });

  it("checks recipe image with OpenRouter Vision model and identifies food photo", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key-123";
    process.env.OPENROUTER_VISION_MODEL = "google/gemini-2.0-flash-exp:free";

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                is_food: true,
                is_safe: true,
                label: "Chicken Biryani",
                issue: "",
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", globalFetch);

    const result = await analyzeImageWithAi("https://example.com/photos/biryani.jpg");
    expect(result.is_food).toBe(true);
    expect(result.is_safe).toBe(true);
    expect(result.label).toBe("Chicken Biryani");
  });

  it("identifies spam links in community reviews via analyzeReviewWithAi", async () => {
    const result = await analyzeReviewWithAi(
      "Amazing food! Check out https://free-crypto-casino.com to win prizes",
      5
    );
    expect(result.is_safe).toBe(false);
    expect(result.verdict).toBe("flagged");
    expect(result.issues.some((i: string) => i.includes("spam link"))).toBe(true);
  });
});
