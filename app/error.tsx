"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black px-4 sm:px-6 lg:px-8 py-10">
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <span className="font-heading text-2xl font-medium tracking-tight text-foreground">
            Hey Garlic
          </span>
          <span className="text-2xl select-none -mt-0.5 leading-none transition-transform duration-300 group-hover:rotate-6">
            🧄
          </span>
        </Link>
      </header>

      <main className="w-full max-w-xl mx-auto my-auto flex flex-col items-center text-center py-12">
        <div className="size-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-6">
          <AlertCircle className="size-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-destructive mb-2">
          Something went wrong
        </span>

        <h1 className="font-heading text-3xl sm:text-4xl font-normal tracking-tight text-foreground mb-4">
          The Pot Boiled Over!
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mb-8">
          An unexpected error occurred while loading this page. Don&apos;t worry, our chefs have been notified!
        </p>

        <div className="flex items-center gap-3.5 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/80 bg-card hover:bg-muted font-medium text-xs sm:text-sm text-foreground active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Home className="size-4" />
            <span>Go to Home</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
