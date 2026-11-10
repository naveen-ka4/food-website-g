import { Suspense } from "react";
import RecipeEditClient from "../[id]/edit/RecipeEditClient";

export const instant = false;

export default function GenericRecipeEditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      }
    >
      <RecipeEditClient initialId="new" isNew={true} />
    </Suspense>
  );
}
