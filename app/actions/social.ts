"use server";

/**
 * Server Actions for Social Features
 * User following, social graph, and related operations
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  withErrorHandling,
  assertAuthenticated,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors/handlers";
import { withRateLimitAction } from "@/lib/security/rateLimit";
import { followUserSchema } from "@/lib/validation/schemas";
import { createNotificationInternal } from "./notifications";

// ==============================================================================
// TYPES
// ==============================================================================

interface FollowResult {
  success: boolean;
  isFollowing: boolean;
  followerCount?: number;
  error?: string;
}

interface UserFollowInfo {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  follower_count: number;
  following_count: number;
  is_following?: boolean;
  is_mutual?: boolean;
  created_at?: string;
}

// ==============================================================================
// FOLLOW / UNFOLLOW ACTIONS
// ==============================================================================

/**
 * Follow a user
 */
export const followUserAction = withRateLimitAction(
  "follow_action",
  withErrorHandling(async (followingId: string): Promise<FollowResult> => {
    // Validate input
    const validated = followUserSchema.parse({ following_id: followingId });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user?.id, "You must be logged in to follow users");

    // Prevent self-follow
    if (user.id === validated.following_id) {
      throw new ConflictError("You cannot follow yourself");
    }

    // Check if already following
    const { data: existing } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", validated.following_id)
      .single();

    if (existing) {
      throw new ConflictError("You are already following this user");
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", validated.following_id)
      .single();

    if (userError || !targetUser) {
      throw new NotFoundError("User not found");
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from("user_follows")
      .insert({
        follower_id: user.id,
        following_id: validated.following_id,
      });

    if (followError) {
      throw new Error(`Failed to follow user: ${followError.message}`);
    }

    // Get updated follower count
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("follower_count")
      .eq("id", validated.following_id)
      .single();

    // Create notification for the followed user
    try {
      await createNotificationInternal({
        userId: validated.following_id,
        actorId: user.id,
        type: "follow",
        title: "New Follower",
        message: `${targetUser.full_name || targetUser.username || "Someone"} started following you`,
        link: `/user/${targetUser.username || validated.following_id}`,
        entityId: user.id,
      });
    } catch (error) {
      // Don't fail the follow action if notification fails
      console.error("Failed to create follow notification:", error);
    }

    // Revalidate relevant paths
    revalidatePath("/profile");
    revalidatePath(`/user/${targetUser.username}`);
    revalidatePath("/feed");

    return {
      success: true,
      isFollowing: true,
      followerCount: updatedProfile?.follower_count,
    };
  }, "followUserAction")
);

/**
 * Unfollow a user
 */
export const unfollowUserAction = withRateLimitAction(
  "follow_action",
  withErrorHandling(async (followingId: string): Promise<FollowResult> => {
    // Validate input
    const validated = followUserSchema.parse({ following_id: followingId });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user?.id, "You must be logged in to unfollow users");

    // Delete follow relationship
    const { error: unfollowError, count } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", validated.following_id);

    if (unfollowError) {
      throw new Error(`Failed to unfollow user: ${unfollowError.message}`);
    }

    if (count === 0) {
      throw new NotFoundError("Follow relationship not found");
    }

    // Get updated follower count
    const { data: updatedProfile } = await supabase
      .from("profiles")
      .select("follower_count, username")
      .eq("id", validated.following_id)
      .single();

    // Revalidate relevant paths
    revalidatePath("/profile");
    revalidatePath(`/user/${updatedProfile?.username}`);
    revalidatePath("/feed");

    return {
      success: true,
      isFollowing: false,
      followerCount: updatedProfile?.follower_count,
    };
  }, "unfollowUserAction")
);

// ==============================================================================
// QUERY ACTIONS
// ==============================================================================

/**
 * Get user's followers list
 */
export const getUserFollowersAction = withErrorHandling(
  async (userId: string, page: number = 1, limit: number = 20): Promise<UserFollowInfo[]> => {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const offset = (page - 1) * limit;

    // Get followers with profile info
    const { data, error } = await supabase
      .from("user_follows")
      .select(
        `
        follower_id,
        created_at,
        profiles!user_follows_follower_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          follower_count,
          following_count
        )
      `
      )
      .eq("following_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch followers: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Check if current user follows each follower (for "Follow Back" button)
    const followers: UserFollowInfo[] = [];
    for (const follow of data) {
      if (!follow.profiles) continue;

      const profile = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles;

      let isFollowing = false;
      if (currentUser) {
        const { data: followCheck } = await supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id)
          .single();

        isFollowing = !!followCheck;
      }

      followers.push({
        id: profile.id,
        username: profile.username || profile.id,
        full_name: profile.full_name || "Anonymous Chef",
        avatar_url: profile.avatar_url,
        follower_count: profile.follower_count || 0,
        following_count: profile.following_count || 0,
        is_following: isFollowing,
        created_at: follow.created_at,
      });
    }

    return followers;
  },
  "getUserFollowersAction"
);

/**
 * Get user's following list
 */
export const getUserFollowingAction = withErrorHandling(
  async (userId: string, page: number = 1, limit: number = 20): Promise<UserFollowInfo[]> => {
    const supabase = await createClient();
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const offset = (page - 1) * limit;

    // Get following with profile info
    const { data, error } = await supabase
      .from("user_follows")
      .select(
        `
        following_id,
        created_at,
        profiles!user_follows_following_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          follower_count,
          following_count
        )
      `
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch following: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    const following: UserFollowInfo[] = data
      .filter((follow) => follow.profiles)
      .map((follow) => {
        const profile = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles;
        return {
          id: profile.id,
          username: profile.username || profile.id,
          full_name: profile.full_name || "Anonymous Chef",
          avatar_url: profile.avatar_url,
          follower_count: profile.follower_count || 0,
          following_count: profile.following_count || 0,
          is_following: true, // Already following by definition
          created_at: follow.created_at,
        };
      });

    return following;
  },
  "getUserFollowingAction"
);

/**
 * Check if current user follows a specific user
 */
export const checkIfFollowingAction = withErrorHandling(
  async (targetUserId: string): Promise<{ isFollowing: boolean; isMutual: boolean }> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isFollowing: false, isMutual: false };
    }

    // Check if current user follows target
    const { data: followData } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .single();

    const isFollowing = !!followData;

    // Check if target follows current user (mutual)
    const { data: mutualData } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", targetUserId)
      .eq("following_id", user.id)
      .single();

    const isMutual = isFollowing && !!mutualData;

    return { isFollowing, isMutual };
  },
  "checkIfFollowingAction"
);

/**
 * Get suggested users to follow (based on mutual follows and popularity)
 */
export const getSuggestedUsersAction = withErrorHandling(
  async (limit: number = 10): Promise<UserFollowInfo[]> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // For anonymous users, return popular users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, follower_count, following_count")
        .order("follower_count", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch suggested users: ${error.message}`);
      }

      return (data || []).map((profile) => ({
        ...profile,
        full_name: profile.full_name || "Anonymous Chef",
        username: profile.username || profile.id,
      }));
    }

    // For authenticated users, suggest based on who people they follow also follow
    const { data: myFollowing } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = myFollowing?.map((f) => f.following_id) || [];

    if (followingIds.length === 0) {
      // No follows yet, return popular users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, follower_count, following_count")
        .neq("id", user.id)
        .order("follower_count", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch suggested users: ${error.message}`);
      }

      return (data || []).map((profile) => ({
        ...profile,
        full_name: profile.full_name || "Anonymous Chef",
        username: profile.username || profile.id,
      }));
    }

    // Find users that people I follow also follow
    const { data: suggestions, error } = await supabase
      .from("user_follows")
      .select(
        `
        following_id,
        profiles!user_follows_following_id_fkey (
          id,
          username,
          full_name,
          avatar_url,
          follower_count,
          following_count
        )
      `
      )
      .in("follower_id", followingIds)
      .not("following_id", "in", `(${[user.id, ...followingIds].join(",")})`)
      .limit(limit * 2); // Get more to account for filtering

    if (error) {
      throw new Error(`Failed to fetch suggested users: ${error.message}`);
    }

    // Deduplicate and rank by how many mutual connections
    const userCounts = new Map<string, { profile: any; count: number }>();

    suggestions?.forEach((follow) => {
      if (!follow.profiles) return;
      const profile = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles;
      const existing = userCounts.get(profile.id);

      if (existing) {
        existing.count += 1;
      } else {
        userCounts.set(profile.id, { profile, count: 1 });
      }
    });

    return Array.from(userCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ profile }) => ({
        id: profile.id,
        username: profile.username || profile.id,
        full_name: profile.full_name || "Anonymous Chef",
        avatar_url: profile.avatar_url,
        follower_count: profile.follower_count || 0,
        following_count: profile.following_count || 0,
      }));
  },
  "getSuggestedUsersAction"
);
