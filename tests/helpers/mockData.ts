/**
 * Mock Data for Testing
 * Centralized test data for consistent testing
 */

import type { User } from "@supabase/supabase-js";

// ==============================================================================
// USER & AUTH MOCKS
// ==============================================================================

export const mockUser: User = {
  id: "user-123",
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.com",
  email_confirmed_at: "2024-01-01T00:00:00Z",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00Z",
  last_sign_in_at: "2024-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {
    full_name: "Test User",
    username: "testuser",
  },
  identities: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: "bearer",
  user: mockUser,
};

export const mockProfile = {
  id: "user-123",
  username: "testuser",
  full_name: "Test User",
  avatar_url: "https://example.com/avatar.jpg",
  bio: "Test bio",
  tagline: "Test tagline",
  status: "active",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  followers_count: 10,
  following_count: 5,
};

// ==============================================================================
// RECIPE MOCKS
// ==============================================================================

export const mockRecipe = {
  id: "recipe-123",
  slug: "test-recipe",
  title: "Test Recipe",
  description: "A delicious test recipe",
  hero_image: "https://example.com/recipe.jpg",
  category: "Dinner",
  meal_type: "Dinner",
  cuisine: "Italian",
  dietary_tag: "Vegetarian",
  tag: "Quick & Easy",
  tags: ["quick", "easy", "healthy"],
  tip: "Test cooking tip",
  cook_time: 30,
  prep_time: 15,
  default_servings: 4,
  rating: 4.5,
  reviews_count: 10,
  view_count: 100,
  save_count: 20,
  popularity_score: 150,
  is_published: true,
  visibility: "public",
  author_id: "user-123",
  ingredients: [
    { name: "Pasta", amount: "500", unit: "g" },
    { name: "Tomato Sauce", amount: "400", unit: "ml" },
  ],
  instructions: [
    { step: 1, instruction: "Boil water" },
    { step: 2, instruction: "Cook pasta" },
  ],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  published_at: "2024-01-01T00:00:00Z",
  profiles: mockProfile,
};

export const mockRecipes = [
  mockRecipe,
  {
    ...mockRecipe,
    id: "recipe-124",
    slug: "another-recipe",
    title: "Another Recipe",
  },
  {
    ...mockRecipe,
    id: "recipe-125",
    slug: "third-recipe",
    title: "Third Recipe",
  },
];

// ==============================================================================
// REVIEW MOCKS
// ==============================================================================

export const mockReview = {
  id: "review-123",
  recipe_id: "recipe-123",
  user_id: "user-123",
  rating: 5,
  comment: "Great recipe!",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  profiles: mockProfile,
};

export const mockReviews = [mockReview];

// ==============================================================================
// SOCIAL MOCKS
// ==============================================================================

export const mockFollow = {
  id: "follow-123",
  follower_id: "user-123",
  following_id: "user-456",
  created_at: "2024-01-01T00:00:00Z",
};

export const mockNotification = {
  id: "notif-123",
  user_id: "user-123",
  notification_type: "follow",
  actor_id: "user-456",
  recipe_id: null,
  review_id: null,
  data: { message: "Test User started following you" },
  is_read: false,
  created_at: "2024-01-01T00:00:00Z",
};

// ==============================================================================
// SEARCH MOCKS
// ==============================================================================

export const mockSearchResult = {
  ...mockRecipe,
  search_rank: 0.5,
  is_saved: false,
  author_name: "Test User",
  author_username: "testuser",
  author_avatar: "https://example.com/avatar.jpg",
};

export const mockSearchSuggestion = {
  suggestion: "pasta",
  suggestion_type: "recipe",
  recipe_id: "recipe-123",
  popularity_score: 100,
};

export const mockSearchFacet = {
  facet_type: "category",
  facet_value: "Dinner",
  recipe_count: 50,
};

// ==============================================================================
// SAVED RECIPE MOCKS
// ==============================================================================

export const mockSavedRecipe = {
  id: "saved-123",
  user_id: "user-123",
  recipe_id: "recipe-123",
  created_at: "2024-01-01T00:00:00Z",
};

// ==============================================================================
// CATEGORY MOCKS
// ==============================================================================

export const mockCategory = {
  id: "cat-123",
  name: "Pasta & Noodles",
  slug: "pasta-noodles",
  image: "https://example.com/pasta.jpg",
  icon: "🍝",
  group_type: "dish_type",
  description: "Delicious pasta recipes",
  is_featured: true,
  sort_order: 1,
  created_at: "2024-01-01T00:00:00Z",
};

// ==============================================================================
// FEED MOCKS
// ==============================================================================

export const mockFeedRecipe = {
  ...mockRecipe,
  feed_reason: "trending",
  feed_score: 100,
};

// ==============================================================================
// ERROR MOCKS
// ==============================================================================

export const mockSupabaseError = {
  message: "Database error",
  details: "Something went wrong",
  hint: "Check your query",
  code: "PGRST116",
};

export const mockAuthError = {
  message: "Invalid credentials",
  status: 401,
};

// ==============================================================================
// FORM DATA MOCKS
// ==============================================================================

export const mockSignUpData = {
  email: "newuser@example.com",
  password: "Password123!",
  confirmPassword: "Password123!",
  username: "newuser",
  termsAccepted: true,
};

export const mockSignInData = {
  email: "test@example.com",
  password: "Password123!",
};

export const mockRecipeFormData = {
  title: "New Test Recipe",
  slug: "new-test-recipe",
  description: "A brand new test recipe",
  hero_image: "https://example.com/new-recipe.jpg",
  category: "Breakfast",
  meal_type: "Breakfast",
  cuisine: "American",
  dietary_tag: "Vegan",
  tag: "Healthy",
  tip: "Enjoy fresh!",
  cook_time: 20,
  prep_time: 10,
  default_servings: 2,
  ingredients: [
    { name: "Oats", amount: "1", unit: "cup" },
    { name: "Milk", amount: "2", unit: "cups" },
  ],
  instructions: [
    { step: 1, instruction: "Mix oats and milk" },
    { step: 2, instruction: "Heat and serve" },
  ],
  visibility: "public",
  is_published: true,
};

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Create a custom user for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    ...mockUser,
    ...overrides,
  };
}

/**
 * Create a custom recipe for testing
 */
export function createMockRecipe(overrides: Partial<typeof mockRecipe> = {}) {
  return {
    ...mockRecipe,
    ...overrides,
  };
}

/**
 * Create a custom profile for testing
 */
export function createMockProfile(overrides: Partial<typeof mockProfile> = {}) {
  return {
    ...mockProfile,
    ...overrides,
  };
}

/**
 * Create mock Supabase response
 */
export function createMockResponse<T>(data: T, error: any = null) {
  return {
    data,
    error,
    count: null,
    status: error ? 400 : 200,
    statusText: error ? "Bad Request" : "OK",
  };
}
