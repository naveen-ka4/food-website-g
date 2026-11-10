"use client";

import React from "react";
import Link from "next/link";
import { X, Bookmark, LogIn, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface SignInPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  redirectUrl?: string;
}

export function SignInPromptModal({
  isOpen,
  onClose,
  title = "Sign in to save recipes",
  description = "Create an account or sign in to save your favorite recipes, build custom Pinterest boards, and share your own culinary creations.",
  redirectUrl = "/login",
}: SignInPromptModalProps) {
  const { l } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 font-sans relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 size-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <Bookmark className="size-6 stroke-[2]" />
          </div>

          <h3 className="font-heading text-xl font-medium text-foreground tracking-tight">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
            {description}
          </p>

          <div className="flex flex-col gap-2.5 w-full mt-6">
            <Link
              href={redirectUrl ? l(`/login?redirect=${encodeURIComponent(redirectUrl)}`) : l("/login")}
              className="w-full py-2.5 rounded-xl bg-foreground text-background font-medium text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <LogIn className="size-4" />
              <span>Sign In to Continue</span>
            </Link>

            <Link
              href={l("/register")}
              className="w-full py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground font-medium text-xs sm:text-sm active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="size-4 text-amber-500" />
              <span>Create Free Account</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors cursor-pointer py-1"
            >
              Continue browsing as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInPromptModal;

