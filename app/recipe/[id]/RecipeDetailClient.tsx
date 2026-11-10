"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Star,
  UtensilsCrossed,
  ChefHat,
  Share2,
  Heart,
  Plus,
  Lightbulb,
  Pencil,
  Printer,
  Flame,
  MessageSquare,
  Send,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { UserDropdown } from "@/components/UserDropdown";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import { useAuth } from "@/context/AuthContext";
import { getRecipeById, getFallbackRecipeById, getCustomRecipe, DetailedRecipe } from "@/lib/recipes";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  getRecipeDetailAction,
  toggleSaveRecipeAction,
  submitRecipeReviewAction,
  getRecipeReviewsAction,
} from "@/app/actions/recipes";
import RecipeReviewsSection from "@/components/RecipeReviewsSection";
import { useTranslation } from "@/lib/i18n/context";
import { localizeIngredientName } from "@/lib/i18n/culinaryTerms";

// Helper function to scale ingredient numbers cleanly
function formatScaledAmount(
  baseAmount: number,
  currentServings: number,
  defaultServings: number
): string {
  if (baseAmount === 0) return "";
  const ratio = currentServings / defaultServings;
  const scaled = baseAmount * ratio;

  // Pretty fraction / decimal formatting
  if (scaled === 0.25) return "1/4";
  if (scaled === 0.33 || scaled === 0.333) return "1/3";
  if (scaled === 0.5) return "1/2";
  if (scaled === 0.75) return "3/4";
  if (scaled === 1.5) return "1 1/2";
  if (scaled === 2.5) return "2 1/2";

  // If integer
  if (Number.isInteger(scaled)) {
    return scaled.toString();
  }

  // Rounded to 1 decimal place if clean
  return Number(scaled.toFixed(1)).toString();
}


function mapRecipeData(dbRecipe: any): DetailedRecipe {
  if (!dbRecipe) return null as any;

  const heroImage =
    dbRecipe.hero_image ||
    dbRecipe.heroImage ||
    dbRecipe.image ||
    "/recipes/creamy-pasta.jpg";

  return {
    id: dbRecipe.slug || dbRecipe.id,
    title: dbRecipe.title || "Delicious Recipe",
    heroImage,
    tag: dbRecipe.tag || (Array.isArray(dbRecipe.tags) && dbRecipe.tags[0]) || "Quick & Easy",
    dietaryTag: dbRecipe.dietary_tag || dbRecipe.dietaryTag,
    description: dbRecipe.description || "",
    cookTime: Number(dbRecipe.cook_time ?? dbRecipe.cookTime ?? 20),
    prepTime: Number(dbRecipe.prep_time ?? dbRecipe.prepTime ?? 10),
    rating: Number(dbRecipe.rating) || 5.0,
    reviewsCount: Number(dbRecipe.reviews_count ?? dbRecipe.reviewsCount ?? 0),
    defaultServings: Number(dbRecipe.default_servings ?? dbRecipe.defaultServings ?? 2),
    category: dbRecipe.category || "General",
    mealType: (dbRecipe.meal_type || dbRecipe.mealType || "Dinner") as any,
    author: {
      name:
        dbRecipe.profiles?.full_name ||
        dbRecipe.profiles?.username ||
        dbRecipe.author?.name ||
        "Garlic Chef",
      handle: `@${(
        dbRecipe.profiles?.username ||
        dbRecipe.author?.handle?.replace("@", "") ||
        dbRecipe.author?.username ||
        "chef"
      )}`,
    },
    tip: dbRecipe.tip || "Enjoy freshly made!",
    tags: Array.isArray(dbRecipe.tags) ? dbRecipe.tags : [],
    ingredients: Array.isArray(dbRecipe.ingredients) && dbRecipe.ingredients.length > 0
      ? dbRecipe.ingredients.map((ing: any) =>
          typeof ing === "string"
            ? { name: ing, baseAmount: 1, unit: "serving", icon: "🥘" }
            : {
                name: ing.name || "",
                baseAmount: Number(ing.baseAmount ?? ing.base_amount ?? 1),
                unit: ing.unit || "",
                icon: ing.icon || "🥘",
                notes: ing.notes,
                group: ing.group,
              }
        )
      : [{ name: "Fresh ingredients", baseAmount: 1, unit: "serving", icon: "🥘" }],
    instructions: Array.isArray(dbRecipe.instructions) && dbRecipe.instructions.length > 0
      ? dbRecipe.instructions.map((inst: any, idx: number) => ({
          stepNumber: Number(inst.stepNumber ?? inst.step_number ?? (idx + 1)),
          title: inst.title || `Step ${idx + 1}`,
          description: inst.description || "",
          image: inst.image || "",
          sectionTitle: inst.sectionTitle || inst.section_title,
        }))
      : [{ stepNumber: 1, title: "Prepare and Cook", description: "Cook ingredients until delicious.", image: "" }],
  };
}

export default function RecipeDetailClient({
  initialId,
  initialRecipe,
}: {
  initialId?: string;
  initialRecipe?: any;
}) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, l, locale } = useTranslation();
  const recipeId =
    initialId || (params?.id as string) || "";

  const [recipe, setRecipe] = useState<DetailedRecipe | null>(() => {
    if (initialRecipe) {
      return mapRecipeData(initialRecipe);
    }
    const local = getRecipeById(recipeId) || getFallbackRecipeById(recipeId);
    if (local) return local;
    const custom = getCustomRecipe(recipeId);
    if (custom) return custom;
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!initialRecipe && !recipe);

  const [currentServings, setCurrentServings] = useState<number>(
    recipe?.defaultServings || 2
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [checkedIngredients, setCheckedIngredients] = useState<
    Record<number, boolean>
  >({});
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isCookMode, setIsCookMode] = useState<boolean>(false);
  const [cookModeStepIndex, setCookModeStepIndex] = useState<number>(0);
  const [recipeUserId, setRecipeUserId] = useState<string | null>(
    () => initialRecipe?.user_id || null
  );
  const [recipeAuthor, setRecipeAuthor] = useState<{
    id: string;
    name: string;
    username: string;
    avatarUrl?: string;
    tagline?: string;
    status?: string;
  } | null>(() => {
    if (initialRecipe?.profiles) {
      return {
        id: initialRecipe.profiles.id,
        name: initialRecipe.profiles.full_name || initialRecipe.profiles.username || "Chef",
        username: initialRecipe.profiles.username || "chef",
        avatarUrl: initialRecipe.profiles.avatar_url || "",
        tagline: initialRecipe.profiles.tagline || "",
        status: initialRecipe.profiles.status || "",
      };
    }
    return null;
  });
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);
  const wakeLockRef = React.useRef<any>(null);

  // Sync custom saved edits, Supabase recipes, and bookmark state safely in useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadDbRecipe() {
      try {
        const dbRecipe = await getRecipeDetailAction(recipeId);
        if (dbRecipe && isMounted) {
          setRecipeUserId(dbRecipe.user_id || null);
          if (dbRecipe.profiles) {
            setRecipeAuthor({
              id: dbRecipe.profiles.id,
              name: dbRecipe.profiles.full_name || dbRecipe.profiles.username || "Chef",
              username: dbRecipe.profiles.username || "chef",
              avatarUrl: dbRecipe.profiles.avatar_url || "",
              tagline: dbRecipe.profiles.tagline || "",
              status: dbRecipe.profiles.status || "",
            });
          }
          const formatted = mapRecipeData(dbRecipe);
          setRecipe(formatted);
          setCurrentServings(formatted.defaultServings || 2);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Could not load from Supabase:", err);
      }

      const custom = getCustomRecipe(recipeId);
      if (custom && isMounted) {
        setRecipe(custom);
        setCurrentServings(custom.defaultServings || 2);
        setIsLoading(false);
        return;
      }

      const local = getRecipeById(recipeId) || getFallbackRecipeById(recipeId);
      if (local && isMounted) {
        setRecipe(local);
        setCurrentServings(local.defaultServings || 2);
      }
      setIsLoading(false);
    }

    if (!recipe) {
      loadDbRecipe();
    } else {
      setIsLoading(false);
    }

    loadDbRecipe();

    try {
      const stored = localStorage.getItem("heygarlic_saved_recipes");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list) && list.some((item) => item.id === recipeId)) {
          setIsSaved(true);
        }
      }
    } catch { }

    return () => {
      isMounted = false;
    };
  }, [recipeId]);

  const handleToggleSave = async () => {
    if (!recipe) return;
    if (!user) {
      setShowSignInModal(true);
      return;
    }

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      await toggleSaveRecipeAction(recipe.id);
    } catch {
      // ignore
    }

    try {
      const stored = localStorage.getItem("heygarlic_saved_recipes");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      if (nextSaved) {
        if (!list.some((item: { id: string }) => item.id === recipe.id)) {
          list.push({
            id: recipe.id,
            title: recipe.title,
            image: recipe.heroImage,
            cookTime: recipe.cookTime,
            rating: recipe.rating,
            category: recipe.category,
          });
        }
        localStorage.setItem("heygarlic_saved_recipes", JSON.stringify(list));
        toast.success("Saved to your recipe collection!", {
          description: `"${recipe.title}" is now bookmarked in your Save tab.`,
        });
      } else {
        list = list.filter((item: any) => item.id !== recipe.id);
        localStorage.setItem("heygarlic_saved_recipes", JSON.stringify(list));
        toast.info("Removed from saved recipes.");
      }
    } catch {
      toast.success(nextSaved ? "Recipe saved!" : "Recipe unsaved.");
    }
  };

  const handleShare = async () => {
    if (!recipe) return;
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${recipe.title} — Hey Garlic`,
          text: recipe.description,
          url: window.location.href,
        });
        return;
      } catch (err) {
        // User cancelled share or fell through
      }
    }

    if (typeof window !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Recipe link copied to clipboard!", {
          description: "Share it with fellow home cooks & food lovers.",
        });
      } catch {
        toast.error("Failed to copy link.");
      }
    }
  };

  const toggleCheckIngredient = (index: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handlePhotoShare = () => {
    toast("Share your photo with @HeyGarlic", {
      description:
        "Tag @HeyGarlic on Instagram or tap to upload your culinary creation!",
      action: {
        label: "Upload photo",
        onClick: () => toast.success("Photo upload modal opened!"),
      },
    });
  };

  const toggleCookMode = async () => {
    const next = !isCookMode;
    setIsCookMode(next);
    if (next) {
      setCookModeStepIndex(0);
      try {
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        }
      } catch {}
      toast.success("Cook Mode Activated", {
        description: "Screen will stay awake while you cook.",
      });
    } else {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
      toast.info("Exited Cook Mode.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-24 text-center flex flex-col items-center gap-4">
          <div className="size-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="size-8" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-medium">
            Recipe Not Found
          </h1>
          <p className="text-sm text-muted-foreground">
            The recipe you are looking for does not exist or has been removed.
          </p>
          <Link
            href={l("/search")}
            className="mt-4 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Explore recipes
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* ======================================================== */}
      {/* 1. TOP HEADER (Matching Hey Garlic reference)            */}
      {/* ======================================================== */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href={l("/")}
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <span className="font-heading text-2xl sm:text-[1.75rem] font-medium tracking-tight text-foreground">
            Hey Garlic
          </span>
          <span className="text-2xl sm:text-3xl select-none -mt-0.5 leading-none transition-transform duration-300 group-hover:rotate-6">
            🧄
          </span>
        </Link>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {user && (
            <Link
              href={l("/recipe/create")}
              aria-label="Add Recipe"
              className="size-10 sm:size-11 rounded-2xl border border-border/80 bg-card flex items-center justify-center text-foreground hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Create and share recipe"
            >
              <Plus className="size-5 stroke-[2.2]" />
            </Link>
          )}

          {/* User Account Menu Avatar Dropdown */}
          <UserDropdown />
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN RECIPE CONTAINER                                 */}
      {/* ======================================================== */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-4 sm:pt-6 pb-20">
        {/* Back Link */}
        <div className="mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/80 hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-1" />
            <span>{t("recipeDetail.backToSearch")}</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TOP SECTION: Hero Image (Left) & Recipe Meta (Right)     */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Big Hero Food Image */}
          <div className="lg:col-span-6 w-full">
            <div className="relative aspect-4/3 sm:aspect-square w-full rounded-3xl overflow-hidden bg-muted shadow-sm border border-border/70 group">
              <Image
                src={recipe.heroImage || "/recipes/creamy-pasta-hero.jpg"}
                alt={recipe.title}
                fill
                priority
                unoptimized={
                  typeof recipe.heroImage === "string" &&
                  (recipe.heroImage.startsWith("data:") || recipe.heroImage.startsWith("blob:"))
                }
                sizes="(max-width: 1024px) 100vw, 550px"
                className="object-cover group-hover:scale-102 transition-transform duration-700"
              />

              {/* Floating Bookmark/Heart Button (Top-Right) */}
              <button
                type="button"
                onClick={handleToggleSave}
                aria-label={isSaved ? "Remove from saved" : "Save recipe"}
                className={`absolute top-4 right-4 size-10 rounded-lg border shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer ${isSaved
                    ? "bg-card text-red-500 border-border/80"
                    : "bg-card/90 backdrop-blur-md text-foreground/80 hover:text-foreground border-border/60 hover:bg-card"
                  }`}
                title={isSaved ? "Saved in your collection" : "Save to collection"}
              >
                <Heart
                  className={`size-5 transition-transform ${isSaved ? "fill-red-500 text-red-500 scale-105" : ""
                    }`}
                />
              </button>

              {/* Floating Category/Dietary Pill (Bottom-Left) */}
              {recipe.dietaryTag && (
                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card/95 backdrop-blur-md border border-border/70 text-xs font-medium text-foreground shadow-xs select-none">
                  <span className="text-emerald-600 dark:text-emerald-400">🌱</span>
                  <span>{recipe.dietaryTag}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Title, Subtitle, Info & Actions */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            {/* Quick & Easy Pill */}
            <div>
              <span className="inline-block px-3.5 py-1 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground/85 shadow-2xs select-none">
                {recipe.tag || "Quick & Easy"}
              </span>
            </div>

            {/* Recipe Title */}
            <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.65rem] font-normal tracking-tight text-foreground leading-[1.14] mt-3.5">
              {recipe.title}
            </h1>

            {/* Description */}
            <p className="mt-3.5 text-sm sm:text-base text-muted-foreground leading-relaxed font-normal">
              {recipe.description}
            </p>

            {/* Author Profile Attribution Card */}
            {recipeAuthor && (
              <div className="mt-4">
                <Link
                  href={l(`/user/${recipeAuthor.id}`)}
                  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted transition-colors text-xs text-foreground group"
                  title={`View recipes by ${recipeAuthor.name}`}
                >
                  <div className="size-6 rounded-full overflow-hidden bg-muted border border-border/70 shrink-0 flex items-center justify-center font-semibold text-[11px] text-foreground">
                    {recipeAuthor.avatarUrl ? (
                      <img
                        src={recipeAuthor.avatarUrl}
                        alt={recipeAuthor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{recipeAuthor.name ? recipeAuthor.name.charAt(0).toUpperCase() : "C"}</span>
                    )}
                  </div>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    by {recipeAuthor.name}
                  </span>
                  {recipeAuthor.status && (
                    <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                      {recipeAuthor.status}
                    </span>
                  )}
                </Link>
              </div>
            )}

            {/* Meta Row: Cook Time, Rating, Servings */}
            <div className="flex items-center gap-6 sm:gap-8 mt-5 py-2 text-xs sm:text-sm text-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="size-4.5 text-muted-foreground shrink-0" />
                <span>{recipe.cookTime} {t("common.mins")}</span>
              </div>

              <Link
                href={l(`/recipe/${recipe.id}/reviews`)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="View reviews and ratings"
              >
                <Star className="size-4.5 text-foreground fill-foreground shrink-0" />
                <span>
                  {recipe.rating} ({recipe.reviewsCount === 1 ? t("recipeDetail.oneReviewLabel") : t("recipeDetail.reviewsCountLabel", { count: recipe.reviewsCount || 0 })})
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <UtensilsCrossed className="size-4.5 text-muted-foreground shrink-0" />
                <span>{currentServings} {t("recipeDetail.servings")}</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2.5 sm:gap-3 mt-6 sm:mt-7 flex-wrap no-print">
              {/* Save Recipe Button */}
              <button
                type="button"
                onClick={handleToggleSave}
                className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg bg-foreground text-background text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer select-none"
              >
                <ChefHat className="size-4" />
                <span>{isSaved ? t("recipeDetail.savedRecipe") : t("recipeDetail.saveRecipe")}</span>
              </button>

              {/* Cook Mode Button */}
              <button
                type="button"
                onClick={toggleCookMode}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs sm:text-sm font-medium active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
                title="Start Cook Mode (keeps phone/screen awake while you cook)"
              >
                <Flame className="size-4 text-amber-500" />
                <span>{t("recipeDetail.cookModeButton")}</span>
              </button>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
              >
                <Share2 className="size-4 text-muted-foreground" />
                <span>{t("recipeDetail.shareRecipe")}</span>
              </button>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium active:scale-95 transition-all shadow-2xs cursor-pointer select-none"
                title="Print printer-friendly recipe"
              >
                <Printer className="size-4 text-muted-foreground" />
                <span>{t("recipeDetail.printRecipe")}</span>
              </button>

              {/* Edit Recipe Button - ONLY visible to the recipe author */}
              {user && recipeUserId && user.id === recipeUserId && (
                <Link
                  href={l(`/recipe/${recipe.id}/edit`)}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground text-xs sm:text-sm font-medium active:scale-95 transition-all shadow-2xs select-none"
                  title="Edit your recipe"
                >
                  <Pencil className="size-3.5 text-muted-foreground" />
                  <span>{t("common.edit")}</span>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* LOWER SECTION: Ingredients (Left) & Instructions (Right) */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mt-12 sm:mt-16 pt-10 border-t border-border/70">
          {/* ------------------------------------------------------ */}
          {/* LEFT: Ingredients & Chef Tip                           */}
          {/* ------------------------------------------------------ */}
          <div className="lg:col-span-5 flex flex-col">
            {/* Ingredients Header with Servings Pill */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-2xl sm:text-3xl font-normal text-foreground tracking-tight">
                {t("recipeDetail.ingredientsTitle")}
              </h2>

              {/* Servings Stepper Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-border/80 bg-card text-xs font-semibold text-foreground shadow-2xs select-none">
                <button
                  type="button"
                  disabled={currentServings <= 1}
                  onClick={() => setCurrentServings((s) => Math.max(1, s - 1))}
                  className="size-5 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer font-bold text-sm"
                  title="Decrease servings"
                  aria-label="Decrease servings"
                >
                  −
                </button>
                <span>{currentServings} {t("common.servings")}</span>
                <button
                  type="button"
                  disabled={currentServings >= 12}
                  onClick={() => setCurrentServings((s) => Math.min(12, s + 1))}
                  className="size-5 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer font-bold text-sm"
                  title="Increase servings"
                  aria-label="Increase servings"
                >
                  +
                </button>
              </div>
            </div>

            {/* Ingredient List */}
            <div className="space-y-6">
              {(() => {
                const hasGroups = recipe.ingredients.some((ing) => !!ing.group);
                if (!hasGroups) {
                  return (
                    <ul className="divide-y divide-border/60">
                      {recipe.ingredients.map((item, idx) => {
                        const scaledAmount = formatScaledAmount(
                          item.baseAmount,
                          currentServings,
                          recipe.defaultServings
                        );
                        const isChecked = !!checkedIngredients[idx];

                        return (
                          <li
                            key={idx}
                            onClick={() => toggleCheckIngredient(idx)}
                            className={`py-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm transition-all cursor-pointer select-none group ${isChecked ? "opacity-45" : ""
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="size-8 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                                {item.icon}
                              </span>
                              <span
                                className={`font-normal text-foreground group-hover:text-primary transition-colors truncate ${isChecked ? "line-through text-muted-foreground" : ""
                                  }`}
                              >
                                {localizeIngredientName(item.name, locale)}
                              </span>
                            </div>
                            <span className="font-medium text-foreground/80 shrink-0 text-right">
                              {scaledAmount ? `${scaledAmount} ` : ""}
                              {item.unit}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                }

                const grouped: {
                  title: string;
                  items: { item: (typeof recipe.ingredients)[0]; originalIndex: number }[];
                }[] = [];

                recipe.ingredients.forEach((item, originalIndex) => {
                  const grpTitle = item.group || "Ingredients";
                  let groupObj = grouped.find((g) => g.title === grpTitle);
                  if (!groupObj) {
                    groupObj = { title: grpTitle, items: [] };
                    grouped.push(groupObj);
                  }
                  groupObj.items.push({ item, originalIndex });
                });

                return grouped.map((grp, gIdx) => (
                  <div key={gIdx} className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground/75 tracking-wider uppercase mt-1 pb-1 border-b border-border/40">
                      {grp.title}
                    </h3>
                    <ul className="divide-y divide-border/60">
                      {grp.items.map(({ item, originalIndex }) => {
                        const scaledAmount = formatScaledAmount(
                          item.baseAmount,
                          currentServings,
                          recipe.defaultServings
                        );
                        const isChecked = !!checkedIngredients[originalIndex];

                        return (
                          <li
                            key={originalIndex}
                            onClick={() => toggleCheckIngredient(originalIndex)}
                            className={`py-3 flex items-center justify-between gap-3 text-xs sm:text-sm transition-all cursor-pointer select-none group ${isChecked ? "opacity-45" : ""
                              }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="size-8 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                                {item.icon}
                              </span>
                              <span
                                className={`font-normal text-foreground group-hover:text-primary transition-colors truncate ${isChecked ? "line-through text-muted-foreground" : ""
                                  }`}
                              >
                                {localizeIngredientName(item.name, locale)}
                              </span>
                            </div>
                            <span className="font-medium text-foreground/80 shrink-0 text-right">
                              {scaledAmount ? `${scaledAmount} ` : ""}
                              {item.unit}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ));
              })()}
            </div>

            {/* Chef Tip Card (matching reference) */}
            {recipe.tip && (
              <div className="mt-8 p-5 rounded-2xl border border-border/80 bg-card/60 shadow-2xs">
                <div className="flex items-center gap-2 text-foreground font-semibold text-xs sm:text-sm">
                  <Lightbulb className="size-4 text-amber-500 fill-amber-500/20" />
                  <span>{t("recipeDetail.chefsNotesTitle")}</span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
                  {recipe.tip}
                </p>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------ */}
          {/* RIGHT: Step-by-Step Instructions & Photo Tag Callout   */}
          {/* ------------------------------------------------------ */}
          <div className="lg:col-span-7 flex flex-col">
            <h2 className="font-heading text-2xl sm:text-3xl font-normal text-foreground tracking-tight mb-5">
              {t("recipeDetail.instructionsTitle")}
            </h2>

            {/* Steps Container */}
            <div className="space-y-6">
              {recipe.instructions.map((step, idx) => {
                const isCurrent = activeStep === step.stepNumber;
                const prevStep = idx > 0 ? recipe.instructions[idx - 1] : null;
                const isNewSection =
                  step.sectionTitle &&
                  (!prevStep || prevStep.sectionTitle !== step.sectionTitle);

                return (
                  <React.Fragment key={step.stepNumber}>
                    {isNewSection && (
                      <div className="pt-2 pb-0.5">
                        <span className="inline-block text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {step.sectionTitle}
                        </span>
                      </div>
                    )}
                    <div
                      onClick={() =>
                        setActiveStep(isCurrent ? null : step.stepNumber)
                      }
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start gap-4 sm:gap-5 group ${isCurrent
                          ? "border-foreground/40 bg-muted/30 shadow-xs"
                          : "border-border/60 bg-card/50 hover:bg-card hover:border-border/80"
                        }`}
                    >
                      {/* Thumbnail Image with Rounded Corners (only render if image exists) */}
                      {Boolean(step.image && step.image.trim()) && (
                        <div className="relative w-full sm:w-36 aspect-4/3 sm:aspect-4/3 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60 shadow-2xs">
                          <Image
                            src={step.image}
                            alt={`Step ${step.stepNumber}: ${step.title}`}
                            fill
                            unoptimized={
                              typeof step.image === "string" &&
                              (step.image.startsWith("data:") || step.image.startsWith("blob:"))
                            }
                            sizes="(max-width: 640px) 100vw, 150px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}

                      {/* Step Content */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0 pt-0.5">
                        {/* Numbered Badge Circle */}
                        <div
                          className={`size-7 rounded-full border flex items-center justify-center text-xs font-semibold shrink-0 shadow-2xs transition-colors mt-0.5 ${isCurrent
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card text-foreground border-border/90 group-hover:border-foreground/70"
                            }`}
                        >
                          {step.stepNumber}
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                            {step.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed font-normal">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Did you make this recipe? Callout Banner */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/60 flex items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-full border border-border/80 bg-muted/60 flex items-center justify-center text-foreground shrink-0">
                  <Heart className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground block">
                    {t("recipeDetail.didYouMakeThis")}
                  </span>
                  <span className="text-[11px] sm:text-xs text-muted-foreground block mt-0.5">
                    {t("recipeDetail.sharePhotoTagUs")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePhotoShare}
                className="size-8 rounded-full border border-border/80 hover:bg-muted flex items-center justify-center text-foreground transition-colors shrink-0 cursor-pointer"
                title="Share your cooking photo"
                aria-label="Share your cooking photo"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* REVIEWS & COMMUNITY RATINGS SECTION                      */}
        {/* ======================================================== */}
        <section className="mt-14 sm:mt-20 pt-10 border-t border-border/70 no-print" id="reviews">
          <RecipeReviewsSection
            recipeId={recipeId}
            recipeTitle={recipe.title}
            initialRating={recipe.rating}
            initialReviewsCount={recipe.reviewsCount}
            isDedicatedPage={false}
          />
        </section>
      </main>

      {/* ======================================================== */}
      {/* COOK MODE (KITCHEN ASSISTANT MODAL WITH WAKE LOCK)       */}
      {/* ======================================================== */}
      {isCookMode && (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md flex flex-col p-4 sm:p-8 animate-in fade-in select-none">
          {/* Top Bar */}
          <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-4 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <Flame className="size-5 text-amber-500 animate-pulse" />
              <div>
                <span className="font-heading text-lg font-bold text-foreground block">
                  {t("recipeDetail.cookModeActiveTitle")}
                </span>
                <span className="text-xs text-muted-foreground block">
                  {t("recipeDetail.cookModeActiveSubtitle", { current: cookModeStepIndex + 1, total: recipe.instructions.length })}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleCookMode}
              className="size-10 rounded-full border border-border/80 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-all cursor-pointer shadow-2xs"
              title="Exit Cook Mode"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Centered Cooking Step Display */}
          <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-center items-center py-8 text-center">
            {recipe.instructions[cookModeStepIndex] && (
              <div className="flex flex-col items-center max-w-2xl animate-in zoom-in-95 duration-200">
                <span className="inline-flex items-center justify-center size-12 rounded-full bg-foreground text-background font-heading text-xl font-bold mb-4 shadow-sm">
                  {recipe.instructions[cookModeStepIndex].stepNumber}
                </span>

                <h2 className="font-heading text-2xl sm:text-4xl font-normal text-foreground tracking-tight leading-snug mb-4">
                  {recipe.instructions[cookModeStepIndex].title}
                </h2>

                <p className="text-base sm:text-xl text-muted-foreground leading-relaxed font-normal mb-6">
                  {recipe.instructions[cookModeStepIndex].description}
                </p>

                {recipe.instructions[cookModeStepIndex].image && (
                  <div className="relative w-64 sm:w-80 aspect-4/3 rounded-2xl overflow-hidden bg-muted border border-border/80 shadow-md mb-4">
                    <img
                      src={recipe.instructions[cookModeStepIndex].image}
                      alt={`Step ${recipe.instructions[cookModeStepIndex].stepNumber}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div className="w-full max-w-3xl mx-auto flex items-center justify-between pt-4 border-t border-border/80">
            <button
              type="button"
              disabled={cookModeStepIndex === 0}
              onClick={() => setCookModeStepIndex((i) => Math.max(0, i - 1))}
              className="flex items-center gap-2 px-5 py-3 rounded-lg border border-border/80 bg-card hover:bg-muted disabled:opacity-40 disabled:pointer-events-none text-foreground font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="size-4" />
              <span>{t("recipeDetail.previousStepButton")}</span>
            </button>

            {cookModeStepIndex < recipe.instructions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCookModeStepIndex((i) => Math.min(recipe.instructions.length - 1, i + 1))}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-foreground text-background font-semibold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <span>{t("recipeDetail.nextStepButton")}</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  toast.success(t("recipeDetail.dishCompletedToast"), {
                    description: t("recipeDetail.dishCompletedDesc"),
                  });
                  toggleCookMode();
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-semibold text-xs sm:text-sm hover:bg-green-700 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Check className="size-4" />
                <span>{t("recipeDetail.finishCookingButton")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Guest Sign In Modal */}
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Sign in to save recipes"
        description="Create an account or sign in to bookmark your favorite recipes, create Pinterest boards, and join the community."
      />
    </div>
  );
}
