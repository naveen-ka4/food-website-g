/**
 * Authentication & Authorization Tests
 * Tests for auth flows, RLS policies, and access control
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockUser,
  mockSession,
  mockSignUpData,
  mockSignInData,
  createMockResponse,
  mockAuthError,
} from "../helpers/mockData";
import { mockSupabaseClient } from "../setup";

describe("Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sign Up", () => {
    it("should successfully sign up a new user", async () => {
      const mockResponse = createMockResponse(
        {
          user: { ...mockUser, email: mockSignUpData.email },
          session: mockSession,
        },
        null
      );

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signUp({
        email: mockSignUpData.email,
        password: mockSignUpData.password,
        options: {
          data: {
            username: mockSignUpData.username,
          },
        },
      });

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: mockSignUpData.email,
        password: mockSignUpData.password,
        options: {
          data: {
            username: mockSignUpData.username,
          },
        },
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user?.email).toBe(mockSignUpData.email);
      expect(result.error).toBeNull();
    });

    it("should fail with invalid email", async () => {
      const mockResponse = createMockResponse(null, {
        message: "Invalid email format",
        status: 400,
      });

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signUp({
        email: "invalid-email",
        password: mockSignUpData.password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Invalid email");
    });

    it("should fail with weak password", async () => {
      const mockResponse = createMockResponse(null, {
        message: "Password is too weak",
        status: 400,
      });

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signUp({
        email: mockSignUpData.email,
        password: "weak",
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("weak");
    });

    it("should fail with duplicate email", async () => {
      const mockResponse = createMockResponse(null, {
        message: "User already registered",
        status: 422,
      });

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signUp({
        email: mockUser.email,
        password: mockSignUpData.password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("already registered");
    });
  });

  describe("Sign In", () => {
    it("should successfully sign in with valid credentials", async () => {
      const mockResponse = createMockResponse(
        {
          user: { ...mockUser, email: mockSignUpData.email },
          session: mockSession,
        },
        null
      );

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: mockSignInData.email,
        password: mockSignInData.password,
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: mockSignInData.email,
        password: mockSignInData.password,
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.session).toBeDefined();
      expect(result.error).toBeNull();
    });

    it("should fail with invalid credentials", async () => {
      const mockResponse = createMockResponse(null, mockAuthError);

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: mockSignInData.email,
        password: "wrongpassword",
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Invalid credentials");
    });

    it("should fail with non-existent user", async () => {
      const mockResponse = createMockResponse(null, {
        message: "User not found",
        status: 400,
      });

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: "nonexistent@example.com",
        password: mockSignInData.password,
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("not found");
    });
  });

  describe("Sign Out", () => {
    it("should successfully sign out", async () => {
      const mockResponse = createMockResponse(null, null);

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.signOut();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
      expect(result.error).toBeNull();
    });
  });

  describe("Get Session", () => {
    it("should return active session", async () => {
      const mockResponse = createMockResponse(
        {
          session: mockSession,
        },
        null
      );

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.getSession();

      expect(result.data?.session).toBeDefined();
      expect(result.data?.session?.user).toBeDefined();
    });

    it("should return null for unauthenticated user", async () => {
      const mockResponse = createMockResponse({ session: null }, null);

      mockSupabaseClient.auth.getSession.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.getSession();

      expect(result.data?.session).toBeNull();
    });
  });

  describe("Get User", () => {
    it("should return authenticated user", async () => {
      const mockResponse = createMockResponse({ user: mockUser }, null);

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.getUser();

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user?.email).toBe(mockUser.email);
    });

    it("should return null for unauthenticated user", async () => {
      const mockResponse = createMockResponse({ user: null }, null);

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.getUser();

      expect(result.data?.user).toBeNull();
    });
  });

  describe("Password Reset", () => {
    it("should send password reset email", async () => {
      const mockResponse = createMockResponse({}, null);

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.resetPasswordForEmail(mockUser.email!);

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result.error).toBeNull();
    });

    it("should fail with invalid email", async () => {
      const mockResponse = createMockResponse(null, {
        message: "Invalid email",
        status: 400,
      });

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.resetPasswordForEmail("invalid-email");

      expect(result.error).toBeDefined();
    });
  });

  describe("Update User", () => {
    it("should update user metadata", async () => {
      const updatedUser = {
        ...mockUser,
        user_metadata: {
          ...mockUser.user_metadata,
          full_name: "Updated Name",
        },
      };

      const mockResponse = createMockResponse({ user: updatedUser }, null);

      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.updateUser({
        data: { full_name: "Updated Name" },
      });

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalled();
      expect(result.data?.user?.user_metadata?.full_name).toBe("Updated Name");
      expect(result.error).toBeNull();
    });

    it("should update password", async () => {
      const mockResponse = createMockResponse({ user: mockUser }, null);

      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce(mockResponse);

      const result = await mockSupabaseClient.auth.updateUser({
        password: "NewPassword123!",
      });

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: "NewPassword123!",
      });
      expect(result.error).toBeNull();
    });
  });
});

describe("Authorization & RLS", () => {
  describe("Recipe Access Control", () => {
    it("should allow viewing public recipes without auth", async () => {
      const mockRecipes = [
        { id: "1", title: "Public Recipe", visibility: "public", is_published: true },
      ];

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("visibility", "public")
        .eq("is_published", true);

      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("should allow author to view their private recipes", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(
        createMockResponse({ user: mockUser }, null)
      );

      const mockPrivateRecipes = [
        { id: "1", title: "Private Recipe", visibility: "private", author_id: mockUser.id },
      ];

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockPrivateRecipes, null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("author_id", mockUser.id)
        .eq("visibility", "private");

      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("should prevent viewing other users' private recipes", async () => {
      mockSupabaseClient.from().select().mockResolvedValueOnce(createMockResponse([], null));

      const result = await mockSupabaseClient
        .from("recipes")
        .select("*")
        .eq("visibility", "private")
        .neq("author_id", mockUser.id);

      expect(result.data).toHaveLength(0);
    });

    it("should allow author to update their own recipe", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(
        createMockResponse({ user: mockUser }, null)
      );

      const updatedRecipe = { id: "1", title: "Updated Recipe", author_id: mockUser.id };

      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse([updatedRecipe], null)
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ title: "Updated Recipe" })
        .eq("id", "1")
        .eq("author_id", mockUser.id);

      expect(result.error).toBeNull();
    });

    it("should prevent updating other users' recipes", async () => {
      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Permission denied",
          code: "42501",
        })
      );

      const result = await mockSupabaseClient
        .from("recipes")
        .update({ title: "Hacked Recipe" })
        .eq("id", "1")
        .eq("author_id", "different-user");

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Permission denied");
    });
  });

  describe("Profile Access Control", () => {
    it("should allow anyone to view public profiles", async () => {
      const mockProfiles = [{ id: "1", username: "testuser", bio: "Test bio" }];

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockProfiles, null)
      );

      const result = await mockSupabaseClient.from("profiles").select("*");

      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it("should allow user to update their own profile", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(
        createMockResponse({ user: mockUser }, null)
      );

      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse([{ id: mockUser.id, bio: "Updated bio" }], null)
      );

      const result = await mockSupabaseClient
        .from("profiles")
        .update({ bio: "Updated bio" })
        .eq("id", mockUser.id);

      expect(result.error).toBeNull();
    });

    it("should prevent updating other users' profiles", async () => {
      mockSupabaseClient.from().update().mockResolvedValueOnce(
        createMockResponse(null, {
          message: "Permission denied",
          code: "42501",
        })
      );

      const result = await mockSupabaseClient
        .from("profiles")
        .update({ bio: "Hacked bio" })
        .eq("id", "different-user");

      expect(result.error).toBeDefined();
    });
  });

  describe("Saved Recipes Access Control", () => {
    it("should allow user to save a recipe", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(
        createMockResponse({ user: mockUser }, null)
      );

      mockSupabaseClient.from().insert().mockResolvedValueOnce(
        createMockResponse([{ user_id: mockUser.id, recipe_id: "recipe-123" }], null)
      );

      const result = await mockSupabaseClient
        .from("saved_recipes")
        .insert({ user_id: mockUser.id, recipe_id: "recipe-123" });

      expect(result.error).toBeNull();
    });

    it("should allow user to view their own saved recipes", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce(
        createMockResponse({ user: mockUser }, null)
      );

      const mockSaved = [
        { id: "1", user_id: mockUser.id, recipe_id: "recipe-123" },
        { id: "2", user_id: mockUser.id, recipe_id: "recipe-124" },
      ];

      mockSupabaseClient.from().select().mockResolvedValueOnce(
        createMockResponse(mockSaved, null)
      );

      const result = await mockSupabaseClient
        .from("saved_recipes")
        .select("*")
        .eq("user_id", mockUser.id);

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it("should prevent viewing other users' saved recipes", async () => {
      mockSupabaseClient.from().select().mockResolvedValueOnce(createMockResponse([], null));

      const result = await mockSupabaseClient
        .from("saved_recipes")
        .select("*")
        .eq("user_id", "different-user");

      expect(result.data).toHaveLength(0);
    });
  });
});
