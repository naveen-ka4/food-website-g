"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  UserPlus,
  UserCheck,
  Settings,
  Sparkles,
  Clock,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { followUserAction, unfollowUserAction } from "@/app/actions/social";
import { RecipeCard } from "@/components/RecipeCard";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

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

interface Recipe {
  id: string;
  slug: string;
  title: string;
  hero_image: string | null;
  category: string;
  cook_time: number;
  rating: number;
  reviews_count: number;
  visibility: string;
  is_published: boolean;
  created_at: string;
}

interface UserProfileClientProps {
  profile: UserProfileData;
  recipes: Recipe[];
  isOwnProfile: boolean;
  initialFollowStatus: { isFollowing: boolean; isMutual: boolean };
  currentUserId?: string;
}

export default function UserProfileClient({
  profile,
  recipes,
  isOwnProfile,
  initialFollowStatus,
  currentUserId,
}: UserProfileClientProps) {
  const router = useRouter();
  const { t, l } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(initialFollowStatus.isFollowing);
  const [isMutual, setIsMutual] = useState(initialFollowStatus.isMutual);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      toast.error("Please log in to follow users");
      router.push(l("/login"));
      return;
    }

    setIsLoading(true);

    try {
      if (isFollowing) {
        // Optimistic update
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));

        const result = await unfollowUserAction(profile.id);
        if (!result.success) {
          // Revert on error
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
          toast.error(result.error || "Failed to unfollow");
        } else {
          toast.success(`Unfollowed ${profile.full_name || profile.username}`);
          if (result.followerCount !== undefined) {
            setFollowerCount(result.followerCount);
          }
        }
      } else {
        // Optimistic update
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);

        const result = await followUserAction(profile.id);
        if (!result.success) {
          // Revert on error
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
          toast.error(result.error || "Failed to follow");
        } else {
          toast.success(`Now following ${profile.full_name || profile.username}`);
          if (result.followerCount !== undefined) {
            setFollowerCount(result.followerCount);
          }
        }
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
      toast.error("An error occurred. Please try again.");
      // Revert optimistic update
      setIsFollowing(!isFollowing);
      setFollowerCount(profile.follower_count);
    } finally {
      setIsLoading(false);
    }
  };

  const displayInitial = profile.full_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 py-8 sm:py-12">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border/80 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer group mb-6"
        >
          <ArrowLeft className="size-4 text-muted-foreground group-hover:text-foreground group-hover:-translate-x-0.5 transition-all" />
          <span>{t("common.back")}</span>
        </button>

        {/* Profile Header */}
        <section className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 sm:gap-8 pb-8 border-b border-border/70">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0 size-32 sm:size-36 md:size-40">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-border/90 bg-muted shadow-lg flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-heading text-5xl font-medium text-foreground">
                    {displayInitial}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-2">
                <h1 className="font-heading text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                  {profile.full_name || profile.username}
                </h1>

                {isMutual && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    <Users className="size-3" />
                    <span>Mutual</span>
                  </span>
                )}

                {profile.status && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20">
                    <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                    <span>{profile.status}</span>
                  </span>
                )}
              </div>

              {profile.username && (
                <p className="text-sm text-muted-foreground mb-1">@{profile.username}</p>
              )}

              {profile.tagline && (
                <p className="text-sm sm:text-base font-medium text-foreground/85 mb-2">
                  {profile.tagline}
                </p>
              )}

              {profile.bio && (
                <p className="text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed mb-3">
                  {profile.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start gap-6 mt-3">
                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {recipes.length}
                  </span>
                  <span className="text-xs text-muted-foreground">Recipes</span>
                </div>

                <div className="h-7 w-px bg-border/80" />

                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {followerCount}
                  </span>
                  <span className="text-xs text-muted-foreground">Followers</span>
                </div>

                <div className="h-7 w-px bg-border/80" />

                <div className="flex flex-col items-center sm:items-start">
                  <span className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight">
                    {profile.following_count}
                  </span>
                  <span className="text-xs text-muted-foreground">Following</span>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
                <Calendar className="size-3.5" />
                <span>
                  Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Link
                href={l("/settings?tab=edit-profile")}
                className="rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Settings className="size-4" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={isLoading}
                className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  isFollowing
                    ? "border border-border/90 bg-card hover:bg-muted text-foreground"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="size-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* Recipes Section */}
        <section className="mt-10">
          <h2 className="text-xl sm:text-2xl font-heading font-normal mb-6">
            Recipes by {profile.full_name || profile.username}
          </h2>

          {recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  id={recipe.id}
                  slug={recipe.slug}
                  title={recipe.title}
                  image={recipe.hero_image || "/category/curries.webp"}
                  cookTime={recipe.cook_time}
                  rating={recipe.rating}
                  onClick={() => router.push(l(`/recipe/${recipe.slug || recipe.id}`))}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/80 p-8">
              <p className="text-lg font-heading text-foreground">
                {isOwnProfile ? "You haven't published any recipes yet" : "No recipes published yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isOwnProfile ? "Create your first recipe to share with the community!" : "Check back later for delicious recipes!"}
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
