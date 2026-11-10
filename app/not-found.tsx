"use client";

import Link from "next/link";
import { ArrowLeft, Search, Home } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function NotFound() {
  const { t, l } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between">
        <Link
          href={l("/")}
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

      {/* Main 404 Content */}
      <main className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center text-center py-12">
        <div className="size-24 sm:size-28 rounded-full overflow-hidden mb-6 border-2 border-border/80 shadow-md">
          <img
            src="/garlic-chef.jpg"
            alt="Hey Garlic Chef"
            className="w-full h-full object-contain"
          />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
          Error 404 &bull; Page Not Found
        </span>

        <h1 className="font-heading text-3xl sm:text-5xl font-normal tracking-tight text-foreground mb-4">
          Oops! Recipe Not in the Kitchen
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md mb-8">
          The dish or page you are looking for seems to have simmered away or doesn&apos;t exist. Let&apos;s get you back on track!
        </p>

        <div className="flex items-center gap-3.5 flex-wrap justify-center">
          <Link
            href={l("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-semibold text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Home className="size-4" />
            <span>Back to Home</span>
          </Link>

          <Link
            href={l("/search")}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-border/80 bg-card hover:bg-muted font-medium text-xs sm:text-sm text-foreground active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Search className="size-4" />
            <span>Search Recipes</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
