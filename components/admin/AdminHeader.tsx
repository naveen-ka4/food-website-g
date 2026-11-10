"use client";

import React from "react";
import Link from "next/link";
import { Menu, Sun, Moon, Plus, User } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
  adminUser?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string;
  };
}

export function AdminHeader({ onOpenMobileMenu, adminUser }: AdminHeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-18 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-foreground font-sans">
            Hey Garlic Dashboard
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Content moderation, recipe distribution, and taxonomy management
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Add Recipe */}
        <Link
          href="/recipe/create"
          target="_blank"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-2xs"
        >
          <Plus className="size-3.5" />
          <span>New Recipe</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme mode"
          className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4 text-yellow-400" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-border">
          {adminUser?.avatar_url ? (
            <img
              src={adminUser.avatar_url}
              alt="Admin Avatar"
              className="size-8 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
              <User className="size-4" />
            </div>
          )}
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-tight">
              {adminUser?.full_name || adminUser?.username || "Admin"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-medium">
              {adminUser?.role || "Staff"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

