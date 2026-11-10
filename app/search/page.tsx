"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronDown,
  SlidersHorizontal,
  Clock,
  Star,
  X,
  ArrowDown,
  ArrowRight,
  Bookmark,
  Check,
  LayoutGrid,
  Zap,
  Leaf,
  UtensilsCrossed,
  Soup,
  Cake,
  Fish,
  Sprout,
  SunMedium,
  Sun,
  Moon,
  Coffee,
  Wheat,
  Milk,
  Dumbbell,
  Menu,
  Globe,
  Flame,
  Sparkles,
  Folder,
} from "lucide-react";
import { useSidebar } from "@/components/Sidebar";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { RecipeCard } from "@/components/RecipeCard";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  getRecipesAction,
  getUserSavedRecipesAction,
  toggleSaveRecipeAction,
} from "@/app/actions/recipes";
import { saveRecentSearch } from "@/lib/recentSearches";
import { CATEGORIES, getCategoriesByGroup } from "@/lib/categories";
import { useTranslation } from "@/lib/i18n/context";
import { localizeCategory, localizeCuisine } from "@/lib/i18n/categoryTerms";

interface Recipe {
  id: string;
  slug?: string;
  title: string;
  image: string;
  cookTime: number; // in minutes
  rating: number;
  reviewsCount?: number;
  category: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  dietary: string[];
  difficulty: "Easy" | "Medium" | "Advanced";
  ingredients: string[];
  tags: string[];
  cuisine?: string;
  author?: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
  };
}

type SortOption = "popular" | "rating" | "time" | "newest";



// Garlic icon for Filter Drawer header
function FilterGarlicHeaderIcon({ className = "size-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 28C11 22 10 14 16 12C22 10 24 18 18 24Z"
        fill="#8BA888"
        stroke="#42382F"
        strokeWidth="1.6"
      />
      <path
        d="M12 36C8 30 7 24 13 22C18 20 20 28 15 33Z"
        fill="#A2BAA0"
        stroke="#42382F"
        strokeWidth="1.6"
      />
      <path
        d="M48 26C54 20 56 12 50 11C44 10 41 18 47 23Z"
        fill="#8BA888"
        stroke="#42382F"
        strokeWidth="1.6"
      />
      <path
        d="M52 35C57 30 58 23 52 22C46 21 44 28 49 33Z"
        fill="#A2BAA0"
        stroke="#42382F"
        strokeWidth="1.6"
      />
      <path
        d="M32 10C32 10 26 17 21 23C16 29 13 35 13 42C13 52 21 58 32 58C43 58 51 52 51 42C51 35 48 29 43 23C38 17 32 10 32 10Z"
        fill="#FAF6EE"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M29 20C25 27 23 35 24 43C25 50 27 55 31 57"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M35 20C39 27 41 35 40 43C39 50 37 55 33 57"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 15V55"
        stroke="#E2D7C5"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 10C31.5 8 32 6 33.5 4.5C34 6.5 33.5 8.5 32 10Z"
        fill="#C8B89F"
        stroke="#42382F"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Smart search matching helper
function matchesSearch(recipe: Recipe, query: string): { matches: boolean; score: number } {
  if (!query.trim()) return { matches: true, score: 0 };

  const cleaned = query
    .toLowerCase()
    .replace(/[&+/,\-–—_()[\]]/g, " ")
    .trim();

  const stopWords = new Set(["and", "the", "with", "for", "in", "of", "a", "an", "or", "to"]);
  const queryWords = cleaned
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && !stopWords.has(w));

  if (queryWords.length === 0) return { matches: true, score: 0 };

  const stem = (w: string) => {
    return w
      .replace(/ies$/, "y")
      .replace(/es$/, "")
      .replace(/s$/, "");
  };

  const titleLower = recipe.title.toLowerCase();
  const categoryLower = recipe.category.toLowerCase();
  const tagsLower = recipe.tags.map((t) => t.toLowerCase());
  const recipeCorpus = [titleLower, categoryLower, ...tagsLower]
    .join(" ")
    .replace(/[&+/,\-–—_()[\]]/g, " ");

  const recipeWords = recipeCorpus.split(/\s+/).filter(Boolean);
  const stemmedRecipeWords = recipeWords.map(stem);

  let score = 0;
  let matchedWordsCount = 0;

  for (const qWord of queryWords) {
    const sQ = stem(qWord);
    let wordMatched = false;

    if (titleLower.includes(qWord) || titleLower.includes(sQ)) {
      score += 20;
      wordMatched = true;
    }

    if (categoryLower.includes(qWord) || categoryLower.includes(sQ)) {
      score += 15;
      wordMatched = true;
    }

    if (tagsLower.some((t) => t.includes(qWord) || t.includes(sQ))) {
      score += 10;
      wordMatched = true;
    }

    if (
      recipeWords.some((rw) => rw.includes(qWord) || qWord.includes(rw)) ||
      stemmedRecipeWords.some((srw) => srw.includes(sQ) || sQ.includes(srw))
    ) {
      score += 5;
      wordMatched = true;
    }

    if (wordMatched) {
      matchedWordsCount++;
    }
  }

  const matches = matchedWordsCount > 0;
  if (matchedWordsCount === queryWords.length) {
    score += 50;
  }

  return { matches, score };
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, l, locale } = useTranslation();
  const queryParam = searchParams.get("q") || "";

  // Core search state
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [visibleCount, setVisibleCount] = useState(9);
  const [savedRecipes, setSavedRecipes] = useState<Record<string, boolean>>({});
  const [dbRecipes, setDbRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const [recipeToUnsave, setRecipeToUnsave] = useState<{
    id: string;
    title: string;
    boardNames: string[];
  } | null>(null);
  const { user } = useAuth();

  // Save incoming query to recent searches
  useEffect(() => {
    if (queryParam.trim()) {
      saveRecentSearch(queryParam.trim());
    }
  }, [queryParam]);

  // Load recipes and bookmarks from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);

        const [saved, fetchedRecipes] = await Promise.all([
          getUserSavedRecipesAction(),
          getRecipesAction({ limit: 100 }),
        ]);

        if (Array.isArray(fetchedRecipes) && fetchedRecipes.length > 0) {
          const mapped: Recipe[] = fetchedRecipes.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            title: r.title,
            image: r.hero_image || "/recipes/creamy-pasta.jpg",
            cookTime: r.cook_time || 20,
            rating: Number(r.rating) || 5.0,
            reviewsCount: r.reviews_count || 0,
            category: r.category || "General",
            mealType: (r.meal_type || "Dinner") as any,
            dietary: r.dietary_tag ? [r.dietary_tag] : [],
            difficulty: "Easy",
            ingredients: Array.isArray(r.ingredients)
              ? r.ingredients
                .map((ing: any) =>
                  typeof ing === "string" ? ing : ing?.name || ""
                )
                .filter(Boolean)
              : [],
            tags: [
              r.category,
              r.tag,
              ...(Array.isArray(r.tags) ? r.tags : []),
            ].filter(Boolean),
            cuisine: r.cuisine || undefined,
            author: r.profiles
              ? {
                id: r.profiles.id,
                name: r.profiles.full_name || r.profiles.username || "Chef",
                username: r.profiles.username || "chef",
                avatarUrl: r.profiles.avatar_url || "",
              }
              : undefined,
          }));
          setDbRecipes(mapped);
        } else {
          setDbRecipes([]);
        }

        if (saved && saved.length > 0) {
          const saveMap: Record<string, boolean> = {};
          saved.forEach((s: any) => {
            if (s?.id) saveMap[s.id] = true;
            if (s?.slug) saveMap[s.slug] = true;
          });
          setSavedRecipes((prev) => ({ ...prev, ...saveMap }));
        }

        // Also hydrate localStorage bookmarks for guest users
        try {
          const stored = localStorage.getItem("heygarlic_saved_recipes");
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              const localMap: Record<string, boolean> = {};
              list.forEach((item: any) => {
                if (item?.id) localMap[item.id] = true;
                if (item?.slug) localMap[item.slug] = true;
              });
              setSavedRecipes((prev) => ({ ...localMap, ...prev }));
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn("Failed to load recipes from Supabase:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter Drawer State (matching reference image)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["All"]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedCookingTimes, setSelectedCookingTimes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null); // null means "Any rating"
  const [includeIngredients, setIncludeIngredients] = useState<string>("");
  const [excludeIngredients, setExcludeIngredients] = useState<string>("");

  // Sync URL query to state
  useEffect(() => {
    setSearchQuery(queryParam);
    if (queryParam) {
      setVisibleCount(9);
    }
  }, [queryParam]);

  // Handle Escape key to close drawer and lock background scroll
  useEffect(() => {
    if (!isFilterOpen) return;

    // Lock body scroll while drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);

  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(9);
    const nextUrl = val.trim()
      ? l(`/search?q=${encodeURIComponent(val.trim())}`)
      : l("/search");
    window.history.replaceState(null, "", nextUrl);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    window.history.replaceState(null, "", l("/search"));
  };

  const checkRecipeBoards = (recipeId: string): string[] => {
    try {
      const key = `heygarlic_boards_${user?.id || "guest"}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const boards = JSON.parse(stored);
        if (Array.isArray(boards)) {
          return boards
            .filter((b: any) => Array.isArray(b.recipeIds) && b.recipeIds.includes(recipeId))
            .map((b: any) => b.name);
        }
      }
    } catch {
      // ignore
    }
    return [];
  };

  const toggleSave = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    const isCurrentlySaved = !!savedRecipes[id];

    // If currently saved, user is clicking to UNSAVE
    if (isCurrentlySaved) {
      const containingBoards = checkRecipeBoards(id);
      if (containingBoards.length > 0) {
        // Recipe is saved in one or more boards - trigger confirmation popup!
        setRecipeToUnsave({
          id,
          title,
          boardNames: containingBoards,
        });
        return;
      }
    }

    // Normal save / unsave
    await executeToggleSave(id, title);
  };

  const executeToggleSave = async (id: string, title: string) => {
    const next = !savedRecipes[id];
    setSavedRecipes((prev) => ({ ...prev, [id]: next }));
    if (next) {
      toast.success(`Saved "${title}" to your recipes!`);
    } else {
      toast("Removed from saved recipes");
      // Also remove from boards in localStorage if unsaving
      try {
        const key = `heygarlic_boards_${user?.id || "guest"}`;
        const storedBoards = localStorage.getItem(key);
        if (storedBoards) {
          const boards = JSON.parse(storedBoards);
          if (Array.isArray(boards)) {
            const updated = boards.map((b: any) => ({
              ...b,
              recipeIds: Array.isArray(b.recipeIds)
                ? b.recipeIds.filter((rid: string) => rid !== id)
                : [],
            }));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      } catch {
        // ignore
      }
    }

    // Update localStorage for guest access
    try {
      const stored = localStorage.getItem("heygarlic_saved_recipes");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      if (next) {
        if (!list.some((item: any) => item.id === id)) {
          const recipeObj = allRecipes.find((r) => r.id === id);
          list.push({
            id,
            title,
            image: recipeObj?.image || "/recipes/creamy-pasta.jpg",
            cookTime: recipeObj?.cookTime || 20,
            rating: recipeObj?.rating || 5.0,
            category: recipeObj?.category || "General",
          });
        }
      } else {
        list = list.filter((item: any) => item.id !== id);
      }
      localStorage.setItem("heygarlic_saved_recipes", JSON.stringify(list));
    } catch {
      // ignore
    }

    if (user) {
      try {
        await toggleSaveRecipeAction(id);
      } catch {
        // ignore
      }
    }
    setRecipeToUnsave(null);
  };

  // Toggle Category item
  const toggleCategory = (cat: string) => {
    if (cat === "All") {
      setSelectedCategories(["All"]);
      return;
    }
    setSelectedCategories((prev) => {
      const filtered = prev.filter((c) => c !== "All");
      if (filtered.includes(cat)) {
        const next = filtered.filter((c) => c !== cat);
        return next.length === 0 ? ["All"] : next;
      } else {
        return [...filtered, cat];
      }
    });
  };

  // Toggle Cuisine
  const toggleCuisine = (cuisineName: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisineName)
        ? prev.filter((c) => c !== cuisineName)
        : [...prev, cuisineName]
    );
  };

  // Toggle Meal type
  const toggleMealType = (type: string) => {
    setSelectedMealTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Toggle Dietary
  const toggleDietary = (item: string) => {
    setSelectedDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]
    );
  };

  // Toggle Cooking Time
  const toggleCookingTime = (timeRange: string) => {
    setSelectedCookingTimes((prev) =>
      prev.includes(timeRange) ? prev.filter((t) => t !== timeRange) : [...prev, timeRange]
    );
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCategories(["All"]);
    setSelectedCuisines([]);
    setSelectedMealTypes([]);
    setSelectedDietary([]);
    setSelectedCookingTimes([]);
    setSelectedDifficulty(null);
    setSelectedRating(null);
    setIncludeIngredients("");
    setExcludeIngredients("");
    setSortBy("popular");
    setSearchQuery("");
    toast.info("All filters reset");
  };

  // Count active drawer filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!selectedCategories.includes("All")) count += selectedCategories.length;
    count += selectedCuisines.length;
    count += selectedMealTypes.length;
    count += selectedDietary.length;
    count += selectedCookingTimes.length;
    if (selectedDifficulty !== null) count += 1;
    if (selectedRating !== null) count += 1;
    if (includeIngredients.trim()) count += 1;
    if (excludeIngredients.trim()) count += 1;
    return count;
  }, [
    selectedCategories,
    selectedCuisines,
    selectedMealTypes,
    selectedDietary,
    selectedCookingTimes,
    selectedDifficulty,
    selectedRating,
    includeIngredients,
    excludeIngredients,
  ]);

  // Filter recipes based on all criteria
  const allRecipes = useMemo(() => {
    return dbRecipes;
  }, [dbRecipes]);

  const filteredRecipes = useMemo(() => {
    let list = allRecipes;

    // 1. Drawer Categories filter
    if (!selectedCategories.includes("All") && selectedCategories.length > 0) {
      list = list.filter((r) =>
        selectedCategories.some((cat) => r.category === cat || r.tags.includes(cat))
      );
    }

    // 2. Cuisine filter
    if (selectedCuisines.length > 0) {
      list = list.filter((r) => {
        const recipeCuisine = (r as any).cuisine;
        return selectedCuisines.some(
          (c) =>
            recipeCuisine === c ||
            r.tags.includes(c) ||
            r.category === c ||
            r.title.toLowerCase().includes(c.toLowerCase())
        );
      });
    }

    // 3. Meal types filter
    if (selectedMealTypes.length > 0) {
      list = list.filter((r) => selectedMealTypes.includes(r.mealType));
    }

    // 4. Dietary preferences filter
    if (selectedDietary.length > 0) {
      list = list.filter((r) =>
        selectedDietary.every((d) => r.dietary.includes(d))
      );
    }

    // 5. Cooking time filter
    if (selectedCookingTimes.length > 0) {
      list = list.filter((r) => {
        return selectedCookingTimes.some((time) => {
          if (time === "under-15") return r.cookTime <= 15;
          if (time === "15-30") return r.cookTime > 15 && r.cookTime <= 30;
          if (time === "30-60") return r.cookTime > 30 && r.cookTime <= 60;
          if (time === "60-plus") return r.cookTime > 60;
          return true;
        });
      });
    }

    // 6. Difficulty filter
    if (selectedDifficulty !== null) {
      list = list.filter((r) => r.difficulty === selectedDifficulty);
    }

    // 7. Rating filter
    if (selectedRating !== null) {
      list = list.filter((r) => r.rating >= selectedRating);
    }

    // 8. Ingredients to include (comma-separated: e.g. "garlic, tomato, chicken")
    if (includeIngredients.trim()) {
      const incItems = includeIngredients
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (incItems.length > 0) {
        list = list.filter((r) =>
          incItems.every((item) =>
            r.ingredients.some((ing) => ing.toLowerCase().includes(item))
          )
        );
      }
    }

    // 9. Ingredients to exclude (comma-separated: e.g. "nuts, dairy, mushrooms")
    if (excludeIngredients.trim()) {
      const excItems = excludeIngredients
        .toLowerCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (excItems.length > 0) {
        list = list.filter(
          (r) =>
            !excItems.some((item) =>
              r.ingredients.some((ing) => ing.toLowerCase().includes(item))
            )
        );
      }
    }

    // 10. Search query filter & relevance score
    if (searchQuery.trim()) {
      const resultsWithScore = list
        .map((recipe) => ({
          recipe,
          ...matchesSearch(recipe, searchQuery),
        }))
        .filter((item) => item.matches);

      resultsWithScore.sort((a, b) => b.score - a.score);
      list = resultsWithScore.map((item) => item.recipe);
    }

    // 11. Sort
    const sorted = [...list];
    if (sortBy === "popular") {
      sorted.sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "time") {
      sorted.sort((a, b) => a.cookTime - b.cookTime);
    } else if (sortBy === "newest") {
      sorted.reverse();
    }

    return sorted;
  }, [
    allRecipes,
    searchQuery,
    selectedCategories,
    selectedCuisines,
    selectedMealTypes,
    selectedDietary,
    selectedCookingTimes,
    selectedDifficulty,
    selectedRating,
    includeIngredients,
    excludeIngredients,
    sortBy,
  ]);

  const displayedRecipes = filteredRecipes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredRecipes.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 6, filteredRecipes.length));
    toast.info(t("search.loadedMoreTitle"), {
      description: t("search.loadedMoreDesc"),
    });
  };

  const sortLabels: Record<SortOption, string> = {
    popular: t("search.sortPopular"),
    rating: t("search.sortRating"),
    time: t("search.sortQuick"),
    newest: t("search.sortNewest"),
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center">
        {/* Page Heading & Search Bar */}
        <section className="pt-10 sm:pt-14 md:pt-16 pb-2 text-center w-full max-w-2xl mx-auto">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-[3.25rem] font-normal tracking-tight text-foreground leading-[1.12]">
            {t("search.title")}
          </h1>

          {/* Search Bar & Filter Toggle Row */}
          <div className="mt-7 sm:mt-8 flex items-center gap-2.5 sm:gap-3 w-full">
            {/* Pill Search Input */}
            <div className="group relative flex items-center w-full rounded-lg border border-border/70 bg-card px-4 py-3 search-bar-glow">
              <Search className="size-5 text-muted-foreground mr-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder={t("search.searchPlaceholder")}
                className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 outline-none border-none font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              aria-label={t("search.filters")}
              onClick={() => setIsFilterOpen(true)}
              className="relative size-11 sm:size-12 rounded-lg border border-border/70 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="size-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 size-5 rounded-md bg-foreground text-background text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </section>

        {/* Results Section */}
        <section className="w-full max-w-6xl mx-auto pt-10 sm:pt-14 pb-16">
          {/* Results Heading & Quick Sort Bar */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {isLoading ? (
                <span className="inline-block w-28 h-4 rounded-md bg-muted/60 animate-pulse" />
              ) : (
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {filteredRecipes.length === 1
                    ? t("search.showingOne")
                    : t("search.showingCount", { count: filteredRecipes.length })}
                </span>
              )}
              {!isLoading && activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                >
                  {t("search.clearAllCount", { count: activeFilterCount })}
                </button>
              )}
            </div>
          </div>

          {/* Recipe Cards Grid with Skeleton Loading */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/70 bg-card p-3 flex flex-col gap-3 animate-pulse"
                >
                  <div className="aspect-[4/3] w-full rounded-xl bg-muted/60" />
                  <div className="space-y-2 p-1">
                    <div className="h-4 w-3/4 rounded-md bg-muted/60" />
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-3 w-16 rounded-md bg-muted/50" />
                      <div className="h-3 w-12 rounded-md bg-muted/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedRecipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
              {displayedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  id={recipe.id}
                  slug={recipe.slug}
                  title={recipe.title}
                  image={recipe.image}
                  cookTime={recipe.cookTime}
                  rating={recipe.rating}
                  isSaved={!!savedRecipes[recipe.id]}
                  onToggleSave={toggleSave}
                  onClick={() => router.push(l(`/recipe/${recipe.slug || recipe.id}`))}
                  authorInfo={
                    recipe.author
                      ? {
                          name: recipe.author.name,
                          username: recipe.author.username || "chef",
                          avatar: recipe.author.avatarUrl || null,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/80 p-8 max-w-lg mx-auto">
              <p className="text-lg font-heading text-foreground">
                {activeFilterCount > 0 || searchQuery.trim()
                  ? t("search.noRecipesFound")
                  : (t("search.noRecipesAvailable") || "No recipes found")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery.trim()
                  ? t("search.noMatchForQuery", { query: searchQuery.trim() })
                  : activeFilterCount > 0
                    ? t("search.noRecipesHint")
                    : (t("search.noRecipesAvailableDesc") || "Check back soon for new delicious recipes!")}
              </p>
              {(activeFilterCount > 0 || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 rounded-xl bg-primary text-primary-foreground px-5 py-2 text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all cursor-pointer"
                >
                  {t("search.clearFilters")}
                </button>
              )}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-12 sm:mt-14 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="rounded-xl border border-border/90 bg-card hover:bg-muted text-foreground px-6 py-2.5 text-xs sm:text-sm font-medium shadow-2xs hover:shadow-xs active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{t("search.loadMore")}</span>
                <ArrowDown className="size-3.5 sm:size-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Slide-in Filter Drawer - Exactly matching reference image */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Dimmed Backdrop */}
          <div
            onClick={() => setIsFilterOpen(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity animate-in fade-in duration-300 cursor-pointer touch-none"
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <aside className="relative w-full sm:w-120 md:w-125 max-w-full bg-background border-l border-border h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 overscroll-contain">
            {/* Drawer Header matching mockup */}
            <div className="px-6 pt-6 pb-4 border-b border-border/60 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <FilterGarlicHeaderIcon className="size-12 shrink-0" />
                <div>
                  <h2 className="font-heading text-2xl font-normal text-foreground tracking-tight leading-tight">
                    {t("search.filterRecipesTitle")}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5">
                    {t("search.filterRecipesDesc")}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                aria-label={t("common.close")}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Filter Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 overscroll-contain">
              {/* 1. Category */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.categoryTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.categoryDesc")}
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCategory("All")}
                    className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${selectedCategories.includes("All")
                      ? "bg-foreground text-background shadow-2xs font-semibold"
                      : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                      }`}
                  >
                    <LayoutGrid className="size-3.5 shrink-0" />
                    <span>{t("search.all")}</span>
                  </button>

                  {CATEGORIES.filter((c) => c.id !== "other" && c.group_type === "dish_type").map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <span>{localizeCategory(cat.name, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Cuisine */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.filterCuisine")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.cuisineDesc")}
                </p>

                <div className="flex flex-wrap gap-2">
                  {getCategoriesByGroup("cuisine").map((cuis) => {
                    const isSelected = selectedCuisines.includes(cuis.name);
                    return (
                      <button
                        key={cuis.id}
                        type="button"
                        onClick={() => toggleCuisine(cuis.name)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Globe className="size-3.5 shrink-0 opacity-70" />
                        <span>{localizeCuisine(cuis.name, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Meal type */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.mealTypeTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.mealTypeDesc")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Breakfast" as const, label: t("search.mealBreakfast"), icon: SunMedium },
                    { id: "Lunch" as const, label: t("search.mealLunch"), icon: Sun },
                    { id: "Dinner" as const, label: t("search.mealDinner"), icon: Moon },
                    { id: "Snack" as const, label: t("search.mealSnack"), icon: Coffee },
                    { id: "Dessert" as const, label: t("search.mealDessert"), icon: Cake },
                  ].map((item) => {
                    const isSelected = selectedMealTypes.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleMealType(item.id)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Dietary preferences */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.filterDietary")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.dietaryDesc")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Vegetarian", label: t("search.dietVegetarian"), icon: Leaf },
                    { id: "Vegan", label: t("search.dietVegan"), icon: Sprout },
                    { id: "Gluten-free", label: t("search.dietGlutenFree"), icon: Wheat },
                    { id: "Keto", label: t("search.dietKeto"), icon: Zap },
                    { id: "Dairy-free", label: t("search.dietDairyFree"), icon: Milk },
                    { id: "High-protein", label: t("search.dietHighProtein"), icon: Dumbbell },
                  ].map((item) => {
                    const isSelected = selectedDietary.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDietary(item.id)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Cooking time */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.filterTime")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.cookingTimeDesc")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "under-15", label: t("search.timeUnder15") },
                    { id: "15-30", label: t("search.time15to30") },
                    { id: "30-60", label: t("search.time30to60") },
                    { id: "60-plus", label: t("search.time60plus") },
                  ].map((item) => {
                    const isSelected = selectedCookingTimes.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleCookingTime(item.id)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Clock className="size-3.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Difficulty */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.filterDifficulty")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.difficultyDesc")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "Easy" as const, label: t("search.diffEasy") },
                    { id: "Medium" as const, label: t("search.diffMedium") },
                    { id: "Advanced" as const, label: t("search.diffAdvanced") },
                  ].map((level) => {
                    const isSelected = selectedDifficulty === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() =>
                          setSelectedDifficulty(isSelected ? null : level.id)
                        }
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Star className="size-3.5 shrink-0" />
                        <span>{level.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 7. Rating */}
              <div>
                <h3 className="font-heading text-lg font-normal text-foreground">
                  {t("search.ratingTitle")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.ratingDesc")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 4.5, label: t("search.rating45Plus") },
                    { value: 4.0, label: t("search.rating40Plus") },
                    { value: null, label: t("search.ratingAny") },
                  ].map((item) => {
                    const isSelected = selectedRating === item.value;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setSelectedRating(item.value)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Star
                          className={`size-3.5 shrink-0 ${isSelected ? "fill-background" : ""
                            }`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 8. Ingredients to include */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-heading text-base font-normal text-foreground">
                    {t("search.ingredientsIncludeTitle")}
                  </h3>
                  <span className="text-2xs text-muted-foreground">{t("search.separateWithComma")}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("search.ingredientsIncludeDesc")}
                </p>

                <div className="relative flex items-center w-full rounded-2xl border border-border/90 bg-card px-4 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-yellow-400/30 focus-within:border-yellow-400 transition-all">
                  <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    value={includeIngredients}
                    onChange={(e) => setIncludeIngredients(e.target.value)}
                    placeholder={t("search.ingredientsIncludePlaceholder")}
                    className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/80 outline-none border-none font-sans"
                  />
                  {includeIngredients && (
                    <button
                      type="button"
                      onClick={() => setIncludeIngredients("")}
                      className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Parsed Comma Chips Preview */}
                {includeIngredients.trim() && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {includeIngredients
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-2xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          <span>+ {item}</span>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* 9. Ingredients to exclude */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-heading text-base font-normal text-foreground">
                    {t("search.ingredientsExcludeTitle")}
                  </h3>
                  <span className="text-2xs text-muted-foreground">{t("search.separateWithComma")}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("search.ingredientsExcludeDesc")}
                </p>

                <div className="relative flex items-center w-full rounded-2xl border border-border/90 bg-card px-4 py-2.5 shadow-2xs focus-within:ring-2 focus-within:ring-red-400/30 focus-within:border-red-400 transition-all">
                  <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    value={excludeIngredients}
                    onChange={(e) => setExcludeIngredients(e.target.value)}
                    placeholder={t("search.ingredientsExcludePlaceholder")}
                    className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/80 outline-none border-none font-sans"
                  />
                  {excludeIngredients && (
                    <button
                      type="button"
                      onClick={() => setExcludeIngredients("")}
                      className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Parsed Comma Chips Preview */}
                {excludeIngredients.trim() && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {excludeIngredients
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-2xs font-medium bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                        >
                          <span>✕ {item}</span>
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* 10. Sort by */}
              <div className="pb-2">
                <h3 className="font-heading text-base font-normal text-foreground">
                  {t("search.sortBy")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {t("search.sortByDesc")}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "popular", label: t("search.sortPopular"), icon: Flame },
                    { id: "rating", label: t("search.sortRating"), icon: Star },
                    { id: "time", label: t("search.sortQuick"), icon: Clock },
                    { id: "newest", label: t("search.sortNewest"), icon: Sparkles },
                  ].map((item) => {
                    const isSelected = sortBy === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSortBy(item.id as SortOption)}
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${isSelected
                          ? "bg-foreground text-background shadow-2xs font-semibold"
                          : "border border-border/80 bg-card text-foreground hover:bg-muted/70"
                          }`}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t border-border/80 bg-background/95 backdrop-blur-md px-6 py-4 flex items-center justify-between mt-auto shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
              >
                {t("search.resetAll")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsFilterOpen(false);
                  toast.success(t("search.toastShowingCount", { count: filteredRecipes.length }));
                }}
                className="rounded-xl bg-foreground text-background px-6 py-2.5 text-xs sm:text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>
                  {filteredRecipes.length === 1
                    ? t("search.showOneButton")
                    : t("search.showCountButton", { count: filteredRecipes.length })}
                </span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Unsave Recipe Confirmation Modal (when recipe is inside one or more boards) */}
      {recipeToUnsave && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRecipeToUnsave(null)}
        >
          <div
            className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bookmark className="size-7 fill-amber-500/30 stroke-[2]" />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <h3 className="font-heading text-xl sm:text-2xl font-medium text-foreground">
                {t("search.removeFromSavedTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t("search.savedInBoards", {
                  title: recipeToUnsave.title,
                  s: recipeToUnsave.boardNames.length > 1 ? "s" : "",
                })}
              </p>

              {/* Badges of containing boards */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 py-1.5 max-h-24 overflow-y-auto">
                {recipeToUnsave.boardNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-muted border border-border/80 text-foreground"
                  >
                    <Folder className="size-3 text-primary" />
                    <span>{name}</span>
                  </span>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground/80 mt-1">
                {t("search.unsaveBoardsWarning", {
                  target:
                    recipeToUnsave.boardNames.length > 1
                      ? t("search.allTheseBoards")
                      : t("search.thisBoard"),
                })}
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full mt-2">
              <button
                type="button"
                onClick={() => setRecipeToUnsave(null)}
                className="flex-1 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground py-2.5 text-xs sm:text-sm font-medium transition-all cursor-pointer"
              >
                {t("search.keepSavedButton")}
              </button>
              <button
                type="button"
                onClick={() => executeToggleSave(recipeToUnsave.id, recipeToUnsave.title)}
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95 py-2.5 text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
              >
                {t("search.unsaveRecipeButton")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Guest Sign In Modal */}
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title={t("search.signInToSaveTitle")}
        description={t("search.signInToSaveDesc")}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
