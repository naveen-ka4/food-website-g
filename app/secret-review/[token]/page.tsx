import React, { Suspense } from "react";
import { connection } from "next/server";
import SecretReviewClient from "./SecretReviewClient";

export const instant = false;

interface SecretReviewPageProps {
  params: Promise<{ token: string }>;
}

export default async function SecretReviewPage({ params }: SecretReviewPageProps) {
  await connection();
  const { token } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-xs text-muted-foreground gap-3">
          <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Verifying security token...</span>
        </div>
      }
    >
      <SecretReviewClient token={token} />
    </Suspense>
  );
}
