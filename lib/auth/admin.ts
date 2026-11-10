import { createClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  email?: string;
  role: "admin" | "moderator";
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

/**
 * Verifies that the current user is authenticated and possesses staff (admin or moderator) privileges.
 * Throws an error or returns null if unauthorized.
 */
export async function verifyAdminSession(
  options: { requireSuperAdmin?: boolean } = {}
): Promise<{ user: AdminUser; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new Error("Unauthorized: Authentication required.");
  }

  // Query profile role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, username, full_name, avatar_url")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Unauthorized: User profile not found.");
  }

  const role = (profile.role as "admin" | "moderator" | "user") || "user";

  if (options.requireSuperAdmin) {
    if (role !== "admin") {
      throw new Error("Forbidden: Super Administrator privileges required.");
    }
  } else {
    if (role !== "admin" && role !== "moderator") {
      throw new Error("Forbidden: Staff privileges required.");
    }
  }

  return {
    user: {
      id: profile.id,
      email: authUser.email,
      role: role as "admin" | "moderator",
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
    supabase,
  };
}

/**
 * Lightweight check to see if current user is an admin without throwing.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const { user } = await verifyAdminSession();
    return user;
  } catch {
    return null;
  }
}

