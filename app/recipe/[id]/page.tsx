import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import RecipeDetailClient from "./RecipeDetailClient";
import { DETAILED_RECIPES, getRecipeById, getFallbackRecipeById } from "@/lib/recipes";
import { getRecipeDetailAction } from "@/app/actions/recipes";

// Prevent Next.js 16 blocking prerender error on dynamic fallback parameters
export const instant = false;

// Pre-generate known recipe paths at build time
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
  let description = "Cook simple, fresh, and flavorful meals with Hey Garlic.";
  let image = "/garlic-chef.jpg";

  // Check Supabase database first so user recipes show proper title & image
  let recipeData: any = null;
  if (id) {
    try {
      recipeData = await getRecipeDetailAction(id);
    } catch {}
  }

  // Fallback to local curated recipes if not found in database
  if (!recipeData && id) {
    recipeData = getRecipeById(id) || getFallbackRecipeById(id);
  }

  if (recipeData) {
    title = recipeData.title || title;
    description = recipeData.description || description;
    image = recipeData.hero_image || recipeData.heroImage || recipeData.image || image;
  }

  return {
    title: `${title} | Hey Garlic`,
    description,
    openGraph: {
      title: `${title} | Hey Garlic`,
      description,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Hey Garlic`,
      description,
      images: [image],
    },
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const resolvedParams = await params;
  const id = resolvedParams?.id || "";

  // 1. Fetch from database first so real user recipes always load
  let recipeData: any = null;
  if (id) {
    try {
      recipeData = await getRecipeDetailAction(id);
    } catch {}
  }

  // 2. Fallback to local curated recipes if not in DB
  if (!recipeData && id) {
    recipeData = getRecipeById(id) || getFallbackRecipeById(id);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipeData?.title || "Hey Garlic Recipe",
    image: [recipeData?.hero_image || recipeData?.heroImage || "/garlic-chef.jpg"],
    description: recipeData?.description || "A delicious homemade recipe on Hey Garlic.",
    cookTime: `PT${recipeData?.cook_time || recipeData?.cookTime || 20}M`,
    prepTime: `PT${recipeData?.prep_time || recipeData?.prepTime || 10}M`,
    recipeYield: `${recipeData?.default_servings || recipeData?.defaultServings || 2} servings`,
    recipeCategory: recipeData?.category || "Dinner",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(recipeData?.rating || "4.9"),
      reviewCount: String(recipeData?.reviews_count || recipeData?.reviewsCount || "1"),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="size-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
        }
      >
        <RecipeDetailClient initialId={id} initialRecipe={recipeData} />
      </Suspense>
    </>
  );
}
