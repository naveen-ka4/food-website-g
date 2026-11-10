"use client";

import React from "react";
import Link from "next/link";
import { Menu, Plus } from "lucide-react";
import { useSidebar } from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { UserDropdown } from "@/components/UserDropdown";
import { useTranslation } from "@/lib/i18n/context";

/* Handcrafted garlic bulb SVG icon */
export function GarlicIcon({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Root base */}
      <path
        d="M21 43C22.5 44 25.5 44 27 43C27.8 42.5 28.5 43.5 29 44C27.5 44.8 25 45 24 45C23 45 20.5 44.8 19 44C19.5 43.5 20.2 42.5 21 43Z"
        fill="#8A6E53"
      />
      {/* Main bulb body */}
      <path
        d="M24 6C23 10 21 16 16 21C11.5 25.5 10 30.5 12 35C14 39.5 18 42 24 42C30 42 34 39.5 36 35C38 30.5 36.5 25.5 32 21C27 16 25 10 24 6Z"
        fill="#F4EFE6"
        stroke="#42382F"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Outer left clove curve */}
      <path
        d="M16 21C12 25 9.5 30 11.5 35C13.2 39 17.5 41.5 23 42"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Outer right clove curve */}
      <path
        d="M32 21C36 25 38.5 30 36.5 35C34.8 39 30.5 41.5 25 42"
        stroke="#42382F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Inner left clove contour */}
      <path
        d="M22 14C19.5 18.5 18 24 18.5 30C19 35 20.5 39 23.5 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Inner right clove contour */}
      <path
        d="M26 14C28.5 18.5 30 24 29.5 30C29 35 27.5 39 24.5 41.5"
        stroke="#D5C7B3"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface HeaderProps {
  className?: string;
  maxWidth?: string;
  showAddRecipe?: boolean;
}

export function Header({
  className = "",
  maxWidth = "max-w-7xl",
  showAddRecipe = true,
}: HeaderProps) {
  const { openSidebar } = useSidebar();
  const { user } = useAuth();
  const { l } = useTranslation();

  return (
    <header
      className={`w-full ${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between ${className}`}
    >
      {/* Brand Logo & Menu Toggle */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          aria-label="Open side menu"
          onClick={openSidebar}
          className="flex md:hidden size-10 rounded-lg border border-border/80 bg-card items-center justify-center text-foreground hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Menu className="size-5" />
        </button>

        <Link
          href={l("/")}
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <span className="font-heading text-2xl sm:text-[1.75rem] font-medium tracking-tight text-foreground">
            Hey Garlic
          </span>
          <GarlicIcon className="size-7 sm:size-8 -mt-0.5 transition-transform duration-300 group-hover:rotate-6" />
        </Link>
      </div>

      {/* Right Navigation Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {user && showAddRecipe && (
          <Link
            href={l("/recipe/create")}
            aria-label="Add Recipe"
            className="size-10 sm:size-11 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="size-5 stroke-[2.2]" />
          </Link>
        )}

        {/* User Account Menu Avatar Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
}

export default Header;

