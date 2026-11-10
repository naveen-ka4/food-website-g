"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, Star, Bookmark, BookmarkCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface RecipeCardProps {
  id: string;
  slug?: string;
  title: string;
  image: string;
  cookTime: number;
  rating: number;
  category?: string;
  isSaved?: boolean;
  onToggleSave?: (id: string, title: string, e: React.MouseEvent) => void;
  onClick?: () => void;
  badge?: React.ReactNode;
  actionButton?: React.ReactNode;
  authorInfo?: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function RecipeCard({
  id,
  slug,
  title,
  image,
  cookTime,
  rating,
  category,
  isSaved,
  onToggleSave,
  onClick,
  badge,
  actionButton,
  authorInfo,
}: RecipeCardProps) {
  const router = useRouter();
  const { l } = useTranslation();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking save button or action button
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    if (onClick) {
      onClick();
    } else {
      router.push(l(`/recipe/${slug || id}`));
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-[0_2px_8px_-2px_oklch(0.218_0_0/0.05)] hover:shadow-[0_12px_28px_-4px_oklch(0.218_0_0/0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          src={image}
          alt={title}
          fill
          unoptimized={typeof image === "string" && (image.startsWith("data:") || image.startsWith("blob:"))}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badge Overlay (top-left) */}
        {badge && (
          <div className="absolute top-2 left-2 z-10">
            {badge}
          </div>
        )}

        {/* Save Button (top-right) */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => onToggleSave(id, title, e)}
            className="absolute top-2 right-2 z-10 size-8 rounded-lg bg-card/85 backdrop-blur-xs flex items-center justify-center text-foreground hover:bg-card transition-all cursor-pointer border border-border/60"
            aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
          >
            {isSaved ? (
              <BookmarkCheck className="size-4 fill-current text-primary" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </button>
        )}

        {/* Action Button (if provided, top-right alternative position) */}
        {actionButton && (
          <div className="absolute top-2 right-2 z-10">
            {actionButton}
          </div>
        )}

        {/* Category Tag (bottom-left) */}
        {category && (
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-card/90 backdrop-blur-xs text-foreground border border-border/60">
            {category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Title */}
        <h3 className="font-heading text-base font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Author Info (if provided) */}
        {authorInfo && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/60">
            <div className="size-6 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
              {authorInfo.avatar ? (
                <img
                  src={authorInfo.avatar}
                  alt={authorInfo.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {authorInfo.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {authorInfo.name}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                @{authorInfo.username}
              </p>
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="size-3.5" />
            <span>{cookTime} min</span>
          </div>

          <div className="flex items-center gap-1">
            <Star className="size-3.5 fill-current text-amber-500" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
