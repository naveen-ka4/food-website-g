import { Suspense } from "react";
import { connection } from "next/server";
import RecipeEditClient from "./RecipeEditClient";
import { DETAILED_RECIPES } from "@/lib/recipes";

// Prevent Next.js 16 blocking prerender error on dynamic fallback parameters
export const instant = false;

// Pre-generate known recipe paths at build time
export function generateStaticParams() {
  return Object.keys(DETAILED_RECIPES).map((id) => ({
    id,
  }));
}

export default async function RecipeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const resolvedParams = await params;
  const id = resolvedParams?.id || "creamy-garlic-parmesan-pasta";

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      }
    >
      <RecipeEditClient initialId={id} />
    </Suspense>
  );
}
