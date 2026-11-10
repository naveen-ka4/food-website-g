import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyAdminSession } from "@/lib/auth/admin";
import * as serverSupabase from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Admin Authorization & Session Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws unauthorized error when user is not logged in", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    (serverSupabase.createClient as any).mockResolvedValue(mockSupabase);

    await expect(verifyAdminSession()).rejects.toThrow(
      "Unauthorized: Authentication required."
    );
  });

  it("throws forbidden error when user has regular 'user' role", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: "user-123", role: "user", username: "culinary_fan" },
              error: null,
            }),
          }),
        }),
      }),
    };
    (serverSupabase.createClient as any).mockResolvedValue(mockSupabase);

    await expect(verifyAdminSession()).rejects.toThrow(
      "Forbidden: Staff privileges required."
    );
  });

  it("grants access when user has 'admin' role", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "admin-123", email: "admin@heygarlic.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "admin-123",
                role: "admin",
                username: "head_chef",
                full_name: "Admin User",
                avatar_url: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    (serverSupabase.createClient as any).mockResolvedValue(mockSupabase);

    const { user } = await verifyAdminSession();
    expect(user.id).toBe("admin-123");
    expect(user.role).toBe("admin");
  });

  it("grants access to moderators by default, but rejects when requireSuperAdmin is true", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "mod-123", email: "mod@heygarlic.com" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "mod-123",
                role: "moderator",
                username: "mod_curator",
                full_name: "Recipe Moderator",
                avatar_url: null,
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    (serverSupabase.createClient as any).mockResolvedValue(mockSupabase);

    // Should succeed for general staff check
    const { user } = await verifyAdminSession();
    expect(user.role).toBe("moderator");

    // Should throw when requireSuperAdmin is specified
    await expect(
      verifyAdminSession({ requireSuperAdmin: true })
    ).rejects.toThrow("Forbidden: Super Administrator privileges required.");
  });
});

