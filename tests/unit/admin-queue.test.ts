import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  approveRecipeAction,
  rejectRecipeAction,
  toggleUserBanAction,
} from "@/app/actions/admin";
import * as adminAuth from "@/lib/auth/admin";

vi.mock("@/lib/auth/admin", () => ({
  verifyAdminSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Admin Review Queue & Moderation Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("approveRecipeAction", () => {
    it("approves recipe and sets is_published to true", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      };

      (adminAuth.verifyAdminSession as any).mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
        supabase: mockSupabase,
      });

      const result = await approveRecipeAction("recipe-123");
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          is_published: true,
          reviewed_by: "admin-1",
        })
      );
    });
  });

  describe("rejectRecipeAction", () => {
    it("rejects recipe with the provided reason", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      };

      (adminAuth.verifyAdminSession as any).mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
        supabase: mockSupabase,
      });

      const result = await rejectRecipeAction("recipe-456", "Missing ingredient quantities");
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          is_published: false,
          moderation_note: "Missing ingredient quantities",
          reviewed_by: "admin-1",
        })
      );
    });

    it("returns error if no rejection reason is provided", async () => {
      (adminAuth.verifyAdminSession as any).mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
        supabase: {},
      });

      const result = await rejectRecipeAction("recipe-456", "   ");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Please specify a reason");
    });
  });

  describe("toggleUserBanAction", () => {
    it("prevents self-demotion / banning own admin account", async () => {
      (adminAuth.verifyAdminSession as any).mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
        supabase: {},
      });

      const result = await toggleUserBanAction("admin-1", true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("You cannot ban your own administrator account");
    });

    it("successfully bans a spammer user", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      };

      (adminAuth.verifyAdminSession as any).mockResolvedValue({
        user: { id: "admin-1", role: "admin" },
        supabase: mockSupabase,
      });

      const result = await toggleUserBanAction("spammer-user-999", true);
      expect(result.success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          is_banned: true,
        })
      );
    });
  });
});

