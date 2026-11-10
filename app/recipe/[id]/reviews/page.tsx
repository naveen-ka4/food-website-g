import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DETAILED_RECIPES, getRecipeById, getFallbackRecipeById } from "@/lib/recipes";
import { getRecipeDetailAction } from "@/app/actions/recipes";
import RecipeReviewsSection from "@/components/RecipeReviewsSection";
import Header from "@/components/header";
import Footer from "@/components/footer";

export const instant = false;

export function generateStaticParams() {
  return Object.keys(DETAILED_RECIPES).map((id) => ({
    id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const id = resolved?.id || "";

  let title = "Delicious Recipe";
  let recipeData: any = null;
  if (id) {
    try {
      recipeData = await getRecipeDetailAction(id);
    } catch {}
  }
  if (!recipeData && id) {
    recipeData = getRecipeById(id) || getFallbackRecipeById(id);
  }
  if (recipeData) {
    title = recipeData.title;
  }

  return {
    title: `Reviews & Ratings — ${title} | Hey Garlic`,
    description: `Read real community ratings and cooking reviews for ${title}.`,
  };
}

export default async function RecipeReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const resolvedParams = await params;
  const id = resolvedParams?.id || "";

  let recipeData: any = null;
  if (id) {
    try {
      recipeData = await getRecipeDetailAction(id);
    } catch {}
  }
  if (!recipeData && id) {
    recipeData = getRecipeById(id) || getFallbackRecipeById(id);
  }

  const recipeTitle = recipeData?.title || "Hey Garlic Recipe";
  const rating = Number(recipeData?.rating) || 5.0;
  const reviewsCount = Number(recipeData?.reviews_count || recipeData?.reviewsCount) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* 1. TOP HEADER BAR */}
      <Header />

      {/* 2. MAIN REVIEWS SECTION */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-4 sm:pt-6 pb-20">
        <RecipeReviewsSection
          recipeId={id}
          recipeTitle={recipeTitle}
          initialRating={rating}
          initialReviewsCount={reviewsCount}
        />
      </main>

      <Footer />
    </div>
  );
}
