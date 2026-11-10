import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FeedPageClient from "./FeedPageClient";
import { generatePersonalizedFeed } from "@/lib/algorithms/feedGenerator";

export const metadata = {
  title: "Your Feed | Hey Garlic",
  description: "Discover personalized recipes from chefs you follow and trending dishes",
};

async function FeedContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login?redirect=/feed");
  }

  // Generate initial feed (first page)
  const initialFeed = await generatePersonalizedFeed(user.id, 1, 20);

  return <FeedPageClient initialFeed={initialFeed} userId={user.id} />;
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      }
    >
      <FeedContent />
    </Suspense>
  );
}
