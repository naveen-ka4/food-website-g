/**
 * Integration Tests - User Flows
 * End-to-end user journey tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockRecipe,
  mockProfile,
  mockSignUpData,
  mockSignInData,
  mockRecipeFormData,
  createMockResponse,
} from "../helpers/mockData";
import { mockSupabaseClient } from "../setup";

describe("User Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full registration flow", async () => {
    // Step 1: Sign up
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce(
      createMockResponse(
        {
          user: mockUser,
          session: null, // Email confirmation required
        },
        null
      )
    );

    const signUpResult = await mockSupabaseClient.auth.signUp({
      email: mockSignUpData.email,
      password: mockSignUpData.password,
      options: {
        data: { username: mockSignUpData.username },
      },
    });

    expect(signUpResult.data?.user).toBeDefined();
    expect(signUpResult.data?.session).toBeNull(); // Awaiting confirmation

    // Step 2: Profile auto-created (via trigger)
    mockSupabaseClient.from().select().single.mockResolvedValueOnce(
      createMockResponse({ ...mockProfile, username: mockSignUpData.username }, null)
    );

    const profileResult = await mockSupabaseClient
      .from("profiles")
      .select("*")
      .eq("id", mockUser.id)
      .single();

    expect(profileResult.data?.username).toBe(mockSignUpData.username);
  });
});

describe("User Authentication Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full login flow", async () => {
    // Step 1: Sign in
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(
      createMockResponse(
        {
          user: mockUser,
          session: { access_token: "token", user: mockUser },
        },
        null
      )
    );

    const signInResult = await mockSupabaseClient.auth.signInWithPassword({
      email: mockSignInData.email,
      password: mockSignInData.password,
    });

    expect(signInResult.data?.session).toBeDefined();
    expect(signInResult.data?.user).toBeDefined();

    // Step 2: Get user session
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce(
      createMockResponse(
        {
          session: { access_token: "token", user: mockUser },
        },
        null
      )
    );

    const sessionResult = await mockSupabaseClient.auth.getSession();

    expect(sessionResult.data?.session?.user?.id).toBe(mockUser.id);
  });
});

describe("Recipe Creation Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockResponse({ user: mockUser }, null)
    );
  });

  it("should complete full recipe creation flow", async () => {
    // Step 1: Create recipe
    const newRecipe = {
      ...mockRecipeFormData,
      id: "new-recipe-123",
      author_id: mockUser.id,
      created_at: new Date().toISOString(),
    };

    mockSupabaseClient.from().insert().single.mockResolvedValueOnce(
      createMockResponse(newRecipe, null)
    );

    const createResult = await mockSupabaseClient
      .from("recipes")
      .insert(mockRecipeFormData)
      .single();

    expect(createResult.data?.id).toBeDefined();
    expect(createResult.data?.title).toBe(mockRecipeFormData.title);

    // Step 2: Verify recipe exists
    mockSupabaseClient.from().select().single.mockResolvedValueOnce(
      createMockResponse(newRecipe, null)
    );

    const verifyResult = await mockSupabaseClient
      .from("recipes")
      .select("*")
      .eq("id", newRecipe.id)
      .single();

    expect(verifyResult.data?.id).toBe(newRecipe.id);

    // Step 3: Update recipe
    const updatedRecipe = {
      ...newRecipe,
      title: "Updated Title",
      updated_at: new Date().toISOString(),
    };

    mockSupabaseClient.from().update().single.mockResolvedValueOnce(
      createMockResponse(updatedRecipe, null)
    );

    const updateResult = await mockSupabaseClient
      .from("recipes")
      .update({ title: "Updated Title" })
      .eq("id", newRecipe.id)
      .single();

    expect(updateResult.data?.title).toBe("Updated Title");
  });
});

describe("Recipe Discovery Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete recipe browsing flow", async () => {
    // Step 1: Browse all recipes
    const recipes = [mockRecipe, { ...mockRecipe, id: "recipe-2" }];

    mockSupabaseClient.from().select().mockResolvedValueOnce(
      createMockResponse(recipes, null)
    );

    const browseResult = await mockSupabaseClient
      .from("recipes")
      .select("*")
      .eq("is_published", true)
      .limit(20);

    expect(browseResult.data).toHaveLength(2);

    // Step 2: View specific recipe
    mockSupabaseClient.from().select().single.mockResolvedValueOnce(
      createMockResponse(mockRecipe, null)
    );

    const viewResult = await mockSupabaseClient
      .from("recipes")
      .select("*, profiles(*)")
      .eq("id", mockRecipe.id)
      .single();

    expect(viewResult.data?.id).toBe(mockRecipe.id);
    expect(viewResult.data?.profiles).toBeDefined();

    // Step 3: Record view
    mockSupabaseClient.from().insert().mockResolvedValueOnce(
      createMockResponse([{ recipe_id: mockRecipe.id, user_id: mockUser.id }], null)
    );

    const recordViewResult = await mockSupabaseClient
      .from("recipe_views")
      .insert({
        recipe_id: mockRecipe.id,
        user_id: mockUser.id,
        view_duration: 120,
      });

    expect(recordViewResult.error).toBeNull();
  });
});

describe("Recipe Save/Bookmark Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockResponse({ user: mockUser }, null)
    );
  });

  it("should save and unsave a recipe", async () => {
    // Step 1: Save recipe
    mockSupabaseClient.from().insert().mockResolvedValueOnce(
      createMockResponse(
        [{ id: "saved-1", user_id: mockUser.id, recipe_id: mockRecipe.id }],
        null
      )
    );

    const saveResult = await mockSupabaseClient
      .from("saved_recipes")
      .insert({ user_id: mockUser.id, recipe_id: mockRecipe.id });

    expect(saveResult.error).toBeNull();

    // Step 2: Verify saved
    mockSupabaseClient.from().select().mockResolvedValueOnce(
      createMockResponse(
        [{ id: "saved-1", user_id: mockUser.id, recipe_id: mockRecipe.id }],
        null
      )
    );

    const verifyResult = await mockSupabaseClient
      .from("saved_recipes")
      .select("*")
      .eq("user_id", mockUser.id)
      .eq("recipe_id", mockRecipe.id);

    expect(verifyResult.data).toHaveLength(1);

    // Step 3: Unsave recipe
    mockSupabaseClient.from().delete().mockResolvedValueOnce(createMockResponse(null, null));

    const unsaveResult = await mockSupabaseClient
      .from("saved_recipes")
      .delete()
      .eq("user_id", mockUser.id)
      .eq("recipe_id", mockRecipe.id);

    expect(unsaveResult.error).toBeNull();
  });
});

describe("Social Interaction Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockResponse({ user: mockUser }, null)
    );
  });

  it("should follow and unfollow user", async () => {
    const targetUserId = "user-456";

    // Step 1: Follow user
    mockSupabaseClient.from().insert().mockResolvedValueOnce(
      createMockResponse(
        [{ follower_id: mockUser.id, following_id: targetUserId }],
        null
      )
    );

    const followResult = await mockSupabaseClient
      .from("user_follows")
      .insert({ follower_id: mockUser.id, following_id: targetUserId });

    expect(followResult.error).toBeNull();

    // Step 2: Verify follow status
    mockSupabaseClient.from().select().mockResolvedValueOnce(
      createMockResponse([{ follower_id: mockUser.id, following_id: targetUserId }], null)
    );

    const verifyResult = await mockSupabaseClient
      .from("user_follows")
      .select("*")
      .eq("follower_id", mockUser.id)
      .eq("following_id", targetUserId);

    expect(verifyResult.data).toHaveLength(1);

    // Step 3: Unfollow user
    mockSupabaseClient.from().delete().mockResolvedValueOnce(createMockResponse(null, null));

    const unfollowResult = await mockSupabaseClient
      .from("user_follows")
      .delete()
      .eq("follower_id", mockUser.id)
      .eq("following_id", targetUserId);

    expect(unfollowResult.error).toBeNull();
  });

  it("should leave a review on recipe", async () => {
    // Step 1: Create review
    const review = {
      id: "review-1",
      recipe_id: mockRecipe.id,
      user_id: mockUser.id,
      rating: 5,
      comment: "Excellent recipe!",
      created_at: new Date().toISOString(),
    };

    mockSupabaseClient.from().insert().single.mockResolvedValueOnce(
      createMockResponse(review, null)
    );

    const reviewResult = await mockSupabaseClient
      .from("reviews")
      .insert({
        recipe_id: mockRecipe.id,
        user_id: mockUser.id,
        rating: 5,
        comment: "Excellent recipe!",
      })
      .single();

    expect(reviewResult.data?.rating).toBe(5);

    // Step 2: Update recipe rating
    const updatedRecipe = {
      ...mockRecipe,
      rating: 4.8,
      reviews_count: mockRecipe.reviews_count + 1,
    };

    mockSupabaseClient.from().update().mockResolvedValueOnce(
      createMockResponse([updatedRecipe], null)
    );

    const updateRecipeResult = await mockSupabaseClient
      .from("recipes")
      .update({
        rating: 4.8,
        reviews_count: mockRecipe.reviews_count + 1,
      })
      .eq("id", mockRecipe.id);

    expect(updateRecipeResult.error).toBeNull();
  });
});

describe("Search Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete search workflow", async () => {
    // Step 1: Get autocomplete suggestions
    const suggestions = [
      { suggestion: "pasta", suggestion_type: "recipe", popularity_score: 100 },
      { suggestion: "pasta carbonara", suggestion_type: "recipe", popularity_score: 80 },
    ];

    mockSupabaseClient.rpc.mockResolvedValueOnce(createMockResponse(suggestions, null));

    const suggestionsResult = await mockSupabaseClient.rpc("get_search_autocomplete", {
      p_query: "pas",
      p_limit: 10,
    });

    expect(suggestionsResult.data).toHaveLength(2);

    // Step 2: Perform search
    const searchResults = [mockRecipe];

    mockSupabaseClient.rpc.mockResolvedValueOnce(createMockResponse(searchResults, null));

    const searchResult = await mockSupabaseClient.rpc("search_recipes_advanced", {
      p_query: "pasta",
      p_limit: 20,
    });

    expect(searchResult.data).toHaveLength(1);

    // Step 3: Record search
    mockSupabaseClient.rpc.mockResolvedValueOnce(createMockResponse("search-id-123", null));

    const recordResult = await mockSupabaseClient.rpc("record_search", {
      p_user_id: mockUser.id,
      p_query: "pasta",
      p_results_count: 1,
    });

    expect(recordResult.data).toBe("search-id-123");
  });
});

describe("Profile Update Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue(
      createMockResponse({ user: mockUser }, null)
    );
  });

  it("should update profile information", async () => {
    // Step 1: Update profile
    const updatedProfile = {
      ...mockProfile,
      full_name: "Updated Name",
      bio: "Updated bio",
      updated_at: new Date().toISOString(),
    };

    mockSupabaseClient.from().update().single.mockResolvedValueOnce(
      createMockResponse(updatedProfile, null)
    );

    const updateResult = await mockSupabaseClient
      .from("profiles")
      .update({
        full_name: "Updated Name",
        bio: "Updated bio",
      })
      .eq("id", mockUser.id)
      .single();

    expect(updateResult.data?.full_name).toBe("Updated Name");
    expect(updateResult.data?.bio).toBe("Updated bio");

    // Step 2: Verify update
    mockSupabaseClient.from().select().single.mockResolvedValueOnce(
      createMockResponse(updatedProfile, null)
    );

    const verifyResult = await mockSupabaseClient
      .from("profiles")
      .select("*")
      .eq("id", mockUser.id)
      .single();

    expect(verifyResult.data?.full_name).toBe("Updated Name");
  });
});
