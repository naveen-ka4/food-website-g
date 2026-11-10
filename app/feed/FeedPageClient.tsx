"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, TrendingUp, Users, ArrowDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/RecipeCard";
import { getFeedRecipesAction } from "@/app/actions/feed";

interface FeedRecipe {
  id: string;
  slug: string;
  title: string;
  hero_image: string | null;
  category: string;
  cook_time: number;
  rating: number;
  reviews_count: number;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  feed_reason?: string;
}

interface FeedPageClientProps {
  initialFeed: FeedRecipe[];
  userId: string;
}

const FeedReasonBadge = ({ reason }: { reason?: string }) => {
  if (!reason) return null;

  const config = {
    from_following: {
      icon: Users,
      label: "From following",
      color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    },
    trending: {
      icon: TrendingUp,
      label: "Trending",
      color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    },
    recommended: {
      icon: Sparkles,
      label: "Recommended",
      color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    },
    popular: {
      icon: Sparkles,
      label: "Popular",
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    },
  };

  const item = config[reason as keyof typeof config] || config.recommended;
  const Icon = item.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${item.color}`}>
      <Icon className="size-2.5" />
      <span>{item.label}</span>
    </span>
  );
};

export default function FeedPageClient({ initialFeed, userId }: FeedPageClientProps) {
  const router = useRouter();
  const { t, l } = useTranslation();
  const [feed, setFeed] = useState<FeedRecipe[]>(initialFeed);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialFeed.length === 20);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll with Intersection Observer
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const result = await getFeedRecipesAction(nextPage, 20);

      if (result.success && result.recipes) {
        setFeed((prev) => [...prev, ...result.recipes!]);
        setPage(nextPage);
        setHasMore(result.recipes.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more feed:", error);
      toast.error("Failed to load more recipes");
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore]);

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, isLoading]);

  // Refresh feed
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await getFeedRecipesAction(1, 20);
      if (result.success && result.recipes) {
        setFeed(result.recipes);
        setPage(1);
        setHasMore(result.recipes.length === 20);
        toast.success("Feed refreshed!");
      }
    } catch (error) {
      console.error("Error refreshing feed:", error);
      toast.error("Failed to refresh feed");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 py-8 sm:py-12">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              Your Feed
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalized recipes from chefs you follow and trending dishes
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Feed Grid */}
        {feed.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {feed.map((recipe) => (
                <div key={recipe.id} className="relative">
                  <RecipeCard
                    id={recipe.id}
                    slug={recipe.slug}
                    title={recipe.title}
                    image={recipe.hero_image || "/category/curries.webp"}
                    cookTime={recipe.cook_time}
                    rating={recipe.rating}
                    onClick={() => router.push(l(`/recipe/${recipe.slug || recipe.id}`))}
                    badge={<FeedReasonBadge reason={recipe.feed_reason} />}
                    authorInfo={{
                      name: recipe.author.full_name,
                      username: recipe.author.username,
                      avatar: recipe.author.avatar_url,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Infinite Scroll Observer Target */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="size-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                    <span className="text-sm">Loading more recipes...</span>
                  </div>
                )}
              </div>
            )}

            {/* End of Feed */}
            {!hasMore && feed.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  You've reached the end of your feed
                </p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-4 text-sm text-primary hover:underline cursor-pointer"
                >
                  Refresh to see new recipes
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-card rounded-2xl border border-border/80 p-8 max-w-lg mx-auto">
            <Sparkles className="size-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-heading font-normal text-foreground mb-2">
              Your feed is empty
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Follow chefs and save recipes to see personalized recommendations here
            </p>
            <button
              type="button"
              onClick={() => router.push(l("/search"))}
              className="rounded-lg bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
            >
              Discover Recipes
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
