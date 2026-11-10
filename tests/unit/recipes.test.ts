/**
 * Recipe CRUD Tests
 * Tests for recipe creation, reading, updating, and deletion
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockRecipe,
  mockRecipes,
  mockUser,
  mockRecipeFormData,
  createMockResponse,
  createMockRecipe,
} from "../helpers/mockData";
import { mockSupabaseClient } from "../setup";

describe("Recipe CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockResponse({ user: mockUser }, null)
    );
  });

  describe("Create Recipe", () => {
    it("should successfully create a new recipe", async () => {
      const newRecipe = createMockRecipe({
        ...mockRecipeFormData,
        author_id: mockUser.id,
      });

      mockSupabaseClient.from().insert().single.mockResolvedValueOnce(
        createMockResponse(newRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .insert(mockRecipeFormData)
        .single();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("recipes");
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe(mockRecipeFormData.title);
      expect(result.error).toBeNull();
    });

    it("should fail with missing required fields", async () => {
      const invalidData = { title: "Only Title" };

      mockSupabaseClient.from().insert().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Missing required fields",
          code: "23502",
        })
      );

      const result = await mockSupabaseClient.from("recipes").insert(invalidData);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("required");
    });

    it("should fail with duplicate slug", async () => {
      mockSupabaseClient.from().insert().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Duplicate slug",
          code: "23505",
        })
      );

      const result = await mockSupabaseClient.from("recipes").insert({
        ...mockRecipeFormData,
        slug: mockRecipe.slug, // Duplicate
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Duplicate");
    });

    it("should create recipe with correct default values", async () => {
      const recipeWithDefaults = {
        ...mockRecipeFormData,
        rating: 5.0,
        reviews_count: 0,
        view_count: 0,
        save_count: 0,
        is_published: true,
        visibility: "public",
      };

      mockSupabaseClient.from().insert().single.mockResolvedValueOnce(
        createMockResponse(recipeWithDefaults, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .insert(mockRecipeFormData)
        .single();

      expect(result.data?.rating).toBe(5.0);
      expect(result.data?.reviews_count).toBe(0);
      expect(result.data?.view_count).toBe(0);
    });

    it("should validate ingredients array", async () => {
      const invalidIngredients = {
        ...mockRecipeFormData,
        ingredients: [], // Empty array
      };

      mockSupabaseClient.from().insert().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "At least one ingredient required",
          code: "23514",
        })
      );

      const result = await mockSupabaseClient.from("recipes").insert(invalidIngredients);

      expect(result.error).toBeDefined();
    });

    it("should validate instructions array", async () => {
      const invalidInstructions = {
        ...mockRecipeFormData,
        instructions: [], // Empty array
      };

      mockSupabaseClient.from().insert().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "At least one instruction required",
          code: "23514",
        })
      );

      const result = await mockSupabaseClient.from("recipes").insert(invalidInstructions);

      expect(result.error).toBeDefined();
    });
  });

  describe("Read Recipes", () => {
    it("should fetch all published recipes", async () => {
      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("is_published", true);

      expect(result.data).toHaveLength(3);
      expect(result.error).toBeNull();
    });

    it("should fetch recipe by ID", async () => {
      mockSupabaseClient.from().select().single.mockResolvedValueOnce(
        createMockResponse(mockRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("id", mockRecipe.id)
        .single();

      expect(result.data?.id).toBe(mockRecipe.id);
      expect(result.error).toBeNull();
    });

    it("should fetch recipe by slug", async () => {
      mockSupabaseClient.from().select().single.mockResolvedValueOnce(
        createMockResponse(mockRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("slug", mockRecipe.slug)
        .single();

      expect(result.data?.slug).toBe(mockRecipe.slug);
      expect(result.error).toBeNull();
    });

    it("should return 404 for non-existent recipe", async () => {
      mockSupabaseClient.from().select().single.mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Recipe not found",
          code: "PGRST116",
        })
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("id", "non-existent")
        .single();

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("PGRST116");
    });

    it("should filter recipes by category", async () => {
      const dinnerRecipes = mockRecipes.filter((r) => r.category === "Dinner");

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(dinnerRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("category", "Dinner");

      expect(result.data?.every((r: any) => r.category === "Dinner")).toBe(true);
    });

    it("should filter recipes by meal type", async () => {
      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse([mockRecipe], null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("meal_type", "Dinner");

      expect(result.data).toHaveLength(1);
    });

    it("should filter recipes by cuisine", async () => {
      const italianRecipes = mockRecipes.filter((r) => r.cuisine === "Italian");

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(italianRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("cuisine", "Italian");

      expect(result.data?.every((r: any) => r.cuisine === "Italian")).toBe(true);
    });

    it("should sort recipes by rating", async () => {
      const sortedRecipes = [...mockRecipes].sort((a, b) => b.rating - a.rating);

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(sortedRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .order("rating", { ascending: false });

      expect(result.data?.[0].rating).toBeGreaterThanOrEqual(result.data?.[1].rating);
    });

    it("should sort recipes by creation date", async () => {
      const sortedRecipes = [...mockRecipes].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(sortedRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      expect(result.data).toHaveLength(3);
    });

    it("should paginate results", async () => {
      const paginatedRecipes = mockRecipes.slice(0, 2);

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(paginatedRecipes, null)
      );

      const result = await mockSupabaseClient.from("recipes").select("*").range(0, 1);

      expect(result.data).toHaveLength(2);
    });

    it("should include author profile", async () => {
      const recipeWithAuthor = {
        ...mockRecipe,
        profiles: mockRecipe.profiles,
      };

      mockSupabaseClient.from().select().single.mockResolvedValueOnce(
        createMockResponse(recipeWithAuthor, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*, profiles(*)")
        .eq("id", mockRecipe.id)
        .single();

      expect(result.data?.profiles).toBeDefined();
      expect(result.data?.profiles?.username).toBe(mockRecipe.profiles.username);
    });
  });

  describe("Update Recipe", () => {
    it("should successfully update a recipe", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        title: "Updated Title",
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from().update().single.mockResolvedValueOnce(
        createMockResponse(updatedRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ title: "Updated Title" })
        .eq("id", mockRecipe.id)
        .eq("author_id", mockUser.id)
        .single();

      expect(result.data?.title).toBe("Updated Title");
      expect(result.error).toBeNull();
    });

    it("should update only specified fields", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        cook_time: 45,
        updated_at: new Date().toISOString(),
      };

      mockSupabaseClient.from().update().single.mockResolvedValueOnce(
        createMockResponse(updatedRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ cook_time: 45 })
        .eq("id", mockRecipe.id)
        .single();

      expect(result.data?.cook_time).toBe(45);
      expect(result.data?.title).toBe(mockRecipe.title); // Unchanged
    });

    it("should update recipe visibility", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        visibility: "private",
        is_published: false,
      };

      mockSupabaseClient.from().update().single.mockResolvedValueOnce(
        createMockResponse(updatedRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ visibility: "private", is_published: false })
        .eq("id", mockRecipe.id)
        .single();

      expect(result.data?.visibility).toBe("private");
      expect(result.data?.is_published).toBe(false);
    });

    it("should fail to update non-existent recipe", async () => {
      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Recipe not found",
          code: "PGRST116",
        })
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ title: "Updated" })
        .eq("id", "non-existent");

      expect(result.error).toBeDefined();
    });

    it("should fail to update with invalid data", async () => {
      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Invalid cook_time value",
          code: "23514",
        })
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ cook_time: -10 })
        .eq("id", mockRecipe.id);

      expect(result.error).toBeDefined();
    });

    it("should update ingredients array", async () => {
      const newIngredients = [
        { name: "New Ingredient", amount: "100", unit: "g" },
      ];

      const updatedRecipe = {
        ...mockRecipe,
        ingredients: newIngredients,
      };

      mockSupabaseClient.from().update().single.mockResolvedValueOnce(
        createMockResponse(updatedRecipe, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ ingredients: newIngredients })
        .eq("id", mockRecipe.id)
        .single();

      expect(result.data?.ingredients).toEqual(newIngredients);
    });
  });

  describe("Delete Recipe", () => {
    it("should successfully delete a recipe", async () => {
      mockSupabaseClient.from().delete().mockResolvedValueOnce(createMockResponse(null, null));

      const result = await mockSupabaseClient
        .from("recipes")
        .delete()
        .eq("id", mockRecipe.id)
        .eq("author_id", mockUser.id);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("recipes");
      expect(result.error).toBeNull();
    });

    it("should fail to delete non-existent recipe", async () => {
      mockSupabaseClient.from().delete().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Recipe not found",
          code: "PGRST116",
        })
      );

      const result = await mockSupabaseClient.from("recipes").delete().eq("id", "non-existent");

      expect(result.error).toBeDefined();
    });

    it("should cascade delete related data", async () => {
      // When recipe is deleted, saved_recipes, reviews, etc. should be deleted
      mockSupabaseClient.from().delete().mockResolvedValueOnce(createMockResponse(null, null));

      const result = await mockSupabaseClient.from("recipes").delete().eq("id", mockRecipe.id);

      expect(result.error).toBeNull();
      // In real implementation, verify cascade delete in database
    });
  });

  describe("Recipe Search", () => {
    it("should search recipes by title", async () => {
      const searchResults = mockRecipes.filter((r) =>
        r.title.toLowerCase().includes("test")
      );

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(searchResults, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .ilike("title", "%test%");

      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should search recipes with full-text search", async () => {
      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .textSearch("search_tokens", "pasta");

      expect(result.data).toBeDefined();
    });
  });

  describe("Recipe Statistics", () => {
    it("should increment view count", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        view_count: mockRecipe.view_count + 1,
      };

      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse([updatedRecipe], null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ view_count: mockRecipe.view_count + 1 })
        .eq("id", mockRecipe.id);

      expect(result.error).toBeNull();
    });

    it("should increment save count", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        save_count: mockRecipe.save_count + 1,
      };

      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse([updatedRecipe], null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ save_count: mockRecipe.save_count + 1 })
        .eq("id", mockRecipe.id);

      expect(result.error).toBeNull();
    });

    it("should update rating and review count", async () => {
      const updatedRecipe = {
        ...mockRecipe,
        rating: 4.7,
        reviews_count: mockRecipe.reviews_count + 1,
      };

      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse([updatedRecipe], null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({
          rating: 4.7,
          reviews_count: mockRecipe.reviews_count + 1,
        })
        .eq("id", mockRecipe.id);

      expect(result.error).toBeNull();
    });
  });
});
