"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur placeholder while loading
 * - Automatic webp conversion via Next.js
 * - Responsive sizing
 * - Error handling with fallback
 * - Priority loading for above-the-fold images
 */

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  eager?: boolean; // Load immediately without lazy loading
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  objectFit = "cover",
  objectPosition = "center",
  quality = 85,
  placeholder = "blur",
  blurDataURL,
  sizes,
  onLoad,
  onError,
  fallbackSrc = "/placeholder-recipe.jpg",
  eager = false,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(eager || priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (eager || priority) return; // Skip observer if eager or priority

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [eager, priority]);

  // Update src when prop changes
  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    console.error(`Failed to load image: ${imageSrc}`);
    setHasError(true);
    setIsLoading(false);
    setImageSrc(fallbackSrc);
    onError?.();
  };

  // Generate blur placeholder if not provided
  const getBlurDataURL = () => {
    if (blurDataURL) return blurDataURL;
    
    // Simple base64 blur placeholder (1x1 pixel)
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=";
  };

  // Default sizes for responsive images
  const defaultSizes =
    sizes ||
    "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        fill && "w-full h-full",
        className
      )}
      style={
        !fill && width && height
          ? {
              width: `${width}px`,
              height: `${height}px`,
            }
          : undefined
      }
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}

      {/* Only render image when in view (or priority/eager) */}
      {isInView && (
        <Image
          src={imageSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          quality={quality}
          sizes={fill ? defaultSizes : sizes}
          placeholder={placeholder}
          blurDataURL={placeholder === "blur" ? getBlurDataURL() : undefined}
          className={cn(
            "transition-opacity duration-300",
            isLoading && "opacity-0",
            !isLoading && "opacity-100"
          )}
          style={{
            objectFit,
            objectPosition,
          }}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs text-muted-foreground">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// LAZY LOAD WRAPPER COMPONENT
// ==============================================================================

interface LazyImageProps extends OptimizedImageProps {
  threshold?: number;
  rootMargin?: string;
}

/**
 * LazyImage - Explicit lazy loading with more control
 */
export function LazyImage({
  threshold = 0.01,
  rootMargin = "100px",
  ...props
}: LazyImageProps) {
  return <OptimizedImage {...props} eager={false} />;
}

// ==============================================================================
// RECIPE IMAGE COMPONENT (Preset for recipe cards)
// ==============================================================================

interface RecipeImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}

export function RecipeImage({ src, alt, priority = false, className }: RecipeImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={priority}
      objectFit="cover"
      quality={80}
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      fallbackSrc="/recipes/placeholder-recipe.jpg"
    />
  );
}

// ==============================================================================
// AVATAR IMAGE COMPONENT (Preset for user avatars)
// ==============================================================================

interface AvatarImageProps {
  src: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarImage({ src, alt, size = "md", className }: AvatarImageProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 64,
    xl: 96,
  };

  const dimension = sizeMap[size];

  return (
    <OptimizedImage
      src={src || "/default-avatar.png"}
      alt={alt}
      width={dimension}
      height={dimension}
      priority={false}
      objectFit="cover"
      quality={90}
      className={cn("rounded-full", className)}
      fallbackSrc="/default-avatar.png"
    />
  );
}

// ==============================================================================
// HERO IMAGE COMPONENT (Above-the-fold priority images)
// ==============================================================================

interface HeroImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function HeroImage({ src, alt, className }: HeroImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={true} // Always priority for hero images
      objectFit="cover"
      quality={90}
      className={className}
      sizes="100vw"
      fallbackSrc="/hero-placeholder.jpg"
    />
  );
}
