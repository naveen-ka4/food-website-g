"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Menu, Sparkles, Heart, Utensils, Users, Shield } from "lucide-react";
import { useSidebar } from "@/components/Sidebar";
import { UserDropdown } from "@/components/UserDropdown";

function GarlicIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 8C20 12 10 20 10 29C10 36.5 16 42 24 42C32 42 38 36.5 38 29C38 20 28 12 24 8Z"
        fill="#F6F1E8"
        stroke="#42382F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M17 26C17 33 20 39 24 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M31 26C31 33 28 39 24 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M24 14V42"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 6C23.5 4.5 24 3 25 2C25.5 3.5 25 5 24 6Z"
        fill="#C8B89F"
        stroke="#42382F"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AboutPage() {
  const { openSidebar } = useSidebar();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            aria-label="Open side menu"
            onClick={openSidebar}
            className="flex md:hidden size-10 rounded-2xl border border-border/80 bg-card items-center justify-center text-foreground hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Menu className="size-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          >
            <span className="font-heading text-2xl sm:text-[1.75rem] font-medium tracking-tight text-foreground">
              Hey Garlic
            </span>
            <GarlicIcon className="size-7 sm:size-8 -mt-0.5 transition-transform duration-300 group-hover:rotate-6" />
          </Link>
        </div>

        <UserDropdown />
      </header>

      {/* Main Content */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-10 sm:pt-14 pb-20">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to home</span>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            <span>Our Story</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-normal tracking-tight text-foreground leading-[1.12]">
            Cook it. Share it. Make it yours.
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed pt-2">
            Hey Garlic is a modern culinary hub crafted for food enthusiasts, passionate home cooks, and recipe creators. We believe good cooking starts with great flavor, simple whole ingredients, and the joy of sharing homemade meals with people you love.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col gap-3">
            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Heart className="size-5" />
            </div>
            <h3 className="font-heading text-xl font-normal text-foreground">
              Heartfelt Recipes
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Every dish on Hey Garlic is curated with precise step-by-step guidance, ingredient scaling, and culinary tips so anyone can master kitchen creations with confidence.
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col gap-3">
            <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Utensils className="size-5" />
            </div>
            <h3 className="font-heading text-xl font-normal text-foreground">
              Smart Kitchen Tools
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Dynamic serving size recalculations, interactive ingredient checklists, and quick local bookmarking designed to make cooking enjoyable without cluttered ads.
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col gap-3">
            <div className="size-11 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="size-5" />
            </div>
            <h3 className="font-heading text-xl font-normal text-foreground">
              Community First
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Share your own kitchen discoveries, publish signature recipes, build custom drafts, and join a supportive network of passionate food lovers.
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-2xs flex flex-col gap-3">
            <div className="size-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Shield className="size-5" />
            </div>
            <h3 className="font-heading text-xl font-normal text-foreground">
              Fast & Private
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Guest users can bookmark recipes locally without creating an account. When you choose to sign up, your culinary collection is securely backed up to the cloud.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
