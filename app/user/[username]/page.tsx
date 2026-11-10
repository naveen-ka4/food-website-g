import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserProfileClient from "./UserProfileClient";

interface UserProfileData {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  tagline: string | null;
  status: string | null;
  follower_count: number;
  following_count: number;
  created_at: string;
}

async function getUserProfile(identifier: string): Promise<UserProfileData | null> {
  const supabase = await createClient();

  // Try finding by username first
  let { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, tagline, status, follower_count, following_count, created_at")
    .eq("username", identifier)
    .maybeSingle();

  // If not found by username, try by ID
  if (!data) {
    const res = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, tagline, status, follower_count, following_count, created_at")
      .eq("id", identifier)
      .maybeSingle();
    data = res.data;
  }

  if (!data) {
    return null;
  }

  return data;
}

async function getUserRecipes(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select("id, slug, title, hero_image, category, cook_time, rating, reviews_count, visibility, is_published, created_at")
    .eq("user_id", userId)
    .eq("is_published", true)
    .in("visibility", ["public", "unlisted"]) // Only show public and unlisted recipes
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching user recipes:", error);
    return [];
  }

  return data || [];
}

async function checkFollowStatus(currentUserId: string | undefined, targetUserId: string) {
  if (!currentUserId) {
    return { isFollowing: false, isMutual: false };
  }

  const supabase = await createClient();

  // Check if current user follows target
  const { data: followData } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  // Check if target follows current user
  const { data: mutualData } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", targetUserId)
    .eq("following_id", currentUserId)
    .maybeSingle();

  return {
    isFollowing: !!followData,
    isMutual: !!followData && !!mutualData,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getUserProfile(username);

  if (!profile) {
    return {
      title: "User Not Found | Hey Garlic",
    };
  }

  return {
    title: `${profile.full_name || profile.username} | Hey Garlic`,
    description: profile.bio || `View ${profile.full_name || profile.username}'s recipes on Hey Garlic`,
    openGraph: {
      title: `${profile.full_name || profile.username} | Hey Garlic`,
      description: profile.bio || `View recipes from ${profile.full_name || profile.username}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

async function UserProfileContent({ usernamePromise }: { usernamePromise: Promise<{ username: string }> }) {
  const { username } = await usernamePromise;
  const profile = await getUserProfile(username);

  if (!profile) {
    notFound();
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Check if this is the current user's own profile
  const isOwnProfile = currentUser?.id === profile.id;

  // Get follow status
  const followStatus = await checkFollowStatus(currentUser?.id, profile.id);

  // Get user's recipes
  const recipes = await getUserRecipes(profile.id);

  return (
    <UserProfileClient
      profile={profile}
      recipes={recipes}
      isOwnProfile={isOwnProfile}
      initialFollowStatus={followStatus}
      currentUserId={currentUser?.id}
    />
  );
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      }
    >
      <UserProfileContent usernamePromise={params} />
    </Suspense>
  );
}
