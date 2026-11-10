"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ArrowRight, X, Clock, Sparkles, UtensilsCrossed } from "lucide-react";
import { FALLBACK_RECIPES } from "@/lib/sampleRecipes";
import { toast } from "sonner";
import { RecipeCard } from "@/components/RecipeCard";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import { useAuth } from "@/context/AuthContext";
import {
  getRecipesAction,
  getUserSavedRecipesAction,
  toggleSaveRecipeAction,
} from "@/app/actions/recipes";
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from "@/lib/recentSearches";
import { getFeaturedCategories, RecipeCategory } from "@/lib/categories";
import { getClientCached, setClientCached } from "@/lib/clientCache";
import { useTranslation } from "@/lib/i18n/context";
import { localizeCategory } from "@/lib/i18n/categoryTerms";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";


function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\export default function HomePage() {");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="font-bold text-primary underline underline-offset-2 decoration-primary/40">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function getRecipeSuggestions(recipes: any[], query: string, max = 5) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: Array<{ recipe: any; score: number }> = [];

  for (const r of recipes) {
    const title = (r.title || "").toLowerCase();
    const category = (r.category || "").toLowerCase();
    const tags = Array.isArray(r.tags) ? r.tags.map((t: string) => t.toLowerCase()) : [];
    const ingredients = Array.isArray(r.ingredients)
      ? r.ingredients.map((ing: any) => (typeof ing === "string" ? ing : ing?.name || "").toLowerCase())
      : [];

    let score = 0;

    if (title === q) {
      score += 100;
    } else if (title.startsWith(q)) {
      score += 80;
    } else if (title.includes(q)) {
      score += 60;
    } else if (title.split(/\s+/).some((w: string) => w.startsWith(q))) {
      score += 50;
    } else if (ingredients.some((ing: string) => ing.includes(q))) {
      score += 30;
    } else if (category.includes(q) || tags.some((t: string) => t.includes(q))) {
      score += 20;
    }

    if (score > 0) {
      results.push({ recipe: r, score });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.recipe.rating || 0) - (a.recipe.rating || 0);
  });

  return results.slice(0, max).map((r) => r.recipe);
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, l, locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [featuredRecipes, setFeaturedRecipes] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Merge dbRecipes with FALLBACK_RECIPES for live instant suggestions
  const searchableRecipes = React.useMemo(() => {
    const list = [...(featuredRecipes || [])];
    const existingIds = new Set(list.map((r: any) => r.slug || r.id));
    for (const r of FALLBACK_RECIPES) {
      if (!existingIds.has(r.slug || r.id)) {
        list.push(r);
      }
    }
    return list;
  }, [featuredRecipes]);

  // Live matching recipe suggestions
  const suggestions = React.useMemo(() => {
    return getRecipeSuggestions(searchableRecipes, searchQuery, 5);
  }, [searchableRecipes, searchQuery]);

  // Reset keyboard active index when query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchQuery]);


  // Load recent searches from localStorage on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Load latest community recipes from Supabase (with client cache)
  useEffect(() => {
    let isMounted = true;
    const cached = getClientCached<any[]>("home_featured_recipes", 60_000);
    if (cached) {
      setFeaturedRecipes(cached);
      return;
    }

    getRecipesAction({ limit: 6 }).then((recipes) => {
      if (recipes && isMounted) {
        setFeaturedRecipes(recipes);
        setClientCached("home_featured_recipes", recipes);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Hydrate saved recipe IDs
  useEffect(() => {
    if (!user) return;
    getUserSavedRecipesAction().then((saves) => {
      if (saves && Array.isArray(saves)) {
        setSavedIds(new Set(saves.map((s: any) => s.id)));
      }
    });
  }, [user]);

  const handleToggleSave = async (recipeId: string, recipeTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowSignInModal(true);
      return;
    }

    const wasSaved = savedIds.has(recipeId);
    const nextSaved = new Set(savedIds);
    if (wasSaved) nextSaved.delete(recipeId);
    else nextSaved.add(recipeId);
    setSavedIds(nextSaved);

    try {
      const res = await toggleSaveRecipeAction(recipeId);
      if (res.success) {
        toast.success(res.isSaved ? `Saved "${recipeTitle}"` : `Removed "${recipeTitle}"`);
      }
    } catch {
      setSavedIds(savedIds);
    }
  };

  // Handle clicking outside the search container to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCategoryClick = (cat: RecipeCategory) => {
    setSelectedCategory(cat.slug === selectedCategory ? null : cat.slug);
    executeSearch(cat.name);
  };

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      const updated = saveRecentSearch(trimmed);
      setRecentSearches(updated);
      setIsSearchFocused(false);
      router.push(l(`/search?q=${encodeURIComponent(trimmed)}`));
    } else {
      setIsSearchFocused(false);
      router.push(l("/search"));
    }
  };

    const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      const selected = suggestions[activeIndex];
      saveRecentSearch(selected.title);
      setIsSearchFocused(false);
      router.push(l(`/recipe/${selected.slug || selected.id}`));
      return;
    }
    executeSearch(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsSearchFocused(false);
      return;
    }
    if (!isSearchFocused || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    }
  };

  const handleRemoveRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = removeRecentSearch(term);
    setRecentSearches(updated);
  };

  const handleClearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="pt-12 sm:pt-16 md:pt-20 pb-4 text-center w-full max-w-3xl mx-auto">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.14]">
            {t("home.heroTitleLine1")}
            <br />
            {t("home.heroTitleLine2")}
          </h1>

          {/* Centered Search Pill */}
          <form
            ref={searchContainerRef}
            onSubmit={handleSearchSubmit}
            className="mt-8 sm:mt-10 mx-auto max-w-xl w-full relative"
          >
            <div className="group relative flex items-center w-full rounded-lg border border-border/70 bg-card px-4 py-3 search-bar-glow">
              <Search className="size-4.5 sm:size-5 text-muted-foreground mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchFocused) setIsSearchFocused(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("home.searchPlaceholder")}
                autoComplete="off"
                className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 outline-none border-none font-sans"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-muted-foreground hover:text-foreground mr-2 cursor-pointer transition-colors"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}

              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs sm:text-sm font-normal text-muted-foreground hover:text-foreground transition-colors pl-2 shrink-0 cursor-pointer select-none"
              >
                <span>{t("common.search")}</span>
                <ArrowRight className="size-3.5 sm:size-4" />
              </button>
            </div>

            {/* Dropdown Menu on Click / Focus */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-border/80 bg-card/95 backdrop-blur-md p-2.5 shadow-xl shadow-black/5 dark:shadow-black/25 z-40 text-left animate-in fade-in zoom-in-95 duration-150">
                {/* Mode 1: User has typed a query */}
                {searchQuery.trim() ? (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeSearch(searchQuery.trim())}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/70 transition-colors text-left cursor-pointer group/search"
                    >
                      <div className="flex items-center gap-2.5 text-sm text-foreground min-w-0">
                        <Search className="size-4 text-yellow-500 shrink-0" />
                        <span className="truncate">
                          Search recipes for &ldquo;
                          <strong className="font-semibold text-foreground">
                            {searchQuery.trim()}
                          </strong>
                          &rdquo;
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover/search:text-foreground font-medium shrink-0 ml-2">
                        <span>Press Enter</span>
                        <ArrowRight className="size-3.5" />
                      </div>
                    </button>

                    {/* Filtered Recent Searches matching current input */}
                    {recentSearches.filter(
                      (s) =>
                        s.toLowerCase().includes(searchQuery.toLowerCase().trim()) &&
                        s.toLowerCase() !== searchQuery.toLowerCase().trim()
                    ).length > 0 && (
                        <div className="pt-1.5 mt-1 border-t border-border/60">
                          <span className="text-[11px] font-medium text-muted-foreground/80 px-2.5 pb-1 block">
                            Recent matches
                          </span>
                          {recentSearches
                            .filter(
                              (s) =>
                                s.toLowerCase().includes(searchQuery.toLowerCase().trim()) &&
                                s.toLowerCase() !== searchQuery.toLowerCase().trim()
                            )
                            .slice(0, 3)
                            .map((term) => (
                              <div
                                key={term}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => executeSearch(term)}
                                className="group/item flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm text-foreground hover:bg-muted/70 transition-colors cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Clock className="size-3.5 text-muted-foreground/60 group-hover/item:text-yellow-500 transition-colors shrink-0" />
                                  <span className="truncate text-foreground font-normal">
                                    {term}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={(e) => handleRemoveRecentSearch(e, term)}
                                  className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all cursor-pointer shrink-0"
                                  title="Remove search"
                                  aria-label={`Remove ${term}`}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                  </div>
                ) : (
                  /* Mode 2: Empty input, show recent searches */
                  <div>
                    {recentSearches.length > 0 ? (
                      <div>
                        {/* Header: Title & Clear All */}
                        <div className="flex items-center justify-between px-2.5 py-1.5 mb-0.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <Clock className="size-3 text-muted-foreground" />
                            <span>{t("home.recentSearches")}</span>
                          </div>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleClearAllRecent}
                            className="text-[11px] text-muted-foreground/80 hover:text-destructive px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            {t("home.clearAll")}
                          </button>
                        </div>

                        {/* Recent Search Items (up to 5-6) */}
                        <div className="space-y-0.5">
                          {recentSearches.slice(0, 6).map((term) => (
                            <div
                              key={term}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => executeSearch(term)}
                              className="group/item flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm text-foreground hover:bg-muted/70 transition-colors cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Clock className="size-3.5 text-muted-foreground/60 group-hover/item:text-yellow-500 transition-colors shrink-0" />
                                <span className="truncate text-foreground font-normal">
                                  {term}
                                </span>
                              </div>

                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) => handleRemoveRecentSearch(e, term)}
                                className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all cursor-pointer shrink-0"
                                title="Remove search"
                                aria-label={`Remove ${term}`}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Zero recent searches: Show popular suggestions */
                      <div className="px-1.5 py-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1.5">
                          <Sparkles className="size-3 text-yellow-500" />
                          <span>Popular searches</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                          {[
                            "Creamy Garlic Pasta",
                            "Lemon Herb Chicken",
                            "Roasted Potatoes",
                            "Tomato Basil Soup",
                            "Garlic Butter Steak",
                          ].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => executeSearch(tag)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted hover:text-foreground text-foreground/80 border border-border/60 transition-colors cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </section>

        {/* Category Browsing Section */}
        <section className="w-full pt-8 sm:pt-10 pb-16">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide uppercase">
              {t("home.browseCategories")}
            </h2>
          </div>

          {/* 6-Column Responsive Grid matching the Reference Design */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5 max-w-6xl mx-auto">
            {getFeaturedCategories().map((cat) => {
              const isSelected = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`group relative flex flex-col items-center justify-between rounded-[24px] border bg-card p-3 sm:p-4 pt-4 sm:pt-5 pb-3 sm:pb-4 text-center transition-all duration-300 cursor-pointer select-none aspect-square overflow-hidden ${isSelected
                    ? "border-accent ring-2 ring-accent/30 shadow-[0_8px_20px_-4px_oklch(0.701_0.056_142.5/0.2)] bg-card -translate-y-1"
                    : "border-border/80 shadow-[0_2px_8px_-2px_oklch(0.218_0_0/0.03)] hover:shadow-[0_12px_26px_-4px_oklch(0.218_0_0/0.09)] hover:-translate-y-1.5 active:scale-[0.98]"
                    }`}
                >
                  {/* Illustration Icon - Zoomed in prominently */}
                  <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      width={140}
                      height={140}
                      className="object-contain max-h-[88%] max-w-[90%] w-auto h-auto scale-115 sm:scale-125 transition-transform duration-300 group-hover:scale-135 drop-shadow-xs"
                      priority={["breakfast", "lunch", "dinner", "dessert"].includes(
                        cat.slug
                      )}
                    />
                  </div>

                  {/* Category Label */}
                  <span
                    className={`mt-2 text-xs sm:text-sm font-medium transition-colors text-center line-clamp-1 shrink-0 ${isSelected
                      ? "text-accent font-semibold"
                      : "text-foreground group-hover:text-primary"
                      }`}
                  >
                    {localizeCategory(cat.name, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Guest Sign In Prompt Modal */}
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Sign in to save recipes"
        description="Join Hey Garlic to bookmark your favorite recipes, create Pinterest boards, and publish your culinary creations."
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
