"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Plus,
    Clock,
    Bookmark,
    Menu,
    Pencil,
    Camera,
    Sparkles,
    CheckCircle2,
} from "lucide-react";
import { useSidebar } from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { UserDropdown } from "@/components/UserDropdown";
import { RecipeCard } from "@/components/RecipeCard";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n/context";
import {
    getUserPublishedRecipesAction,
    getUserSavedRecipesAction,
} from "@/app/actions/recipes";

interface RecipeCardData {
    id: string;
    slug?: string;
    title: string;
    image: string;
    cookTime: number;
    rating: number;
    category?: string;
    isSaved?: boolean;
    isPublished?: boolean;
}

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
                stroke="#42382F"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M31 26C31 33 28 39 24 41.5"
                stroke="#42382F"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M24 14V42"
                stroke="#42382F"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M22 14C19.5 18.5 18 24 18.5 30C19 35 20.5 39 23.5 41.5"
                stroke="#D5C7B3"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M26 14C28.5 18.5 30 24 29.5 30C29 35 27.5 39 24.5 41.5"
                stroke="#D5C7B3"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M24 6C23.5 4.5 24 3 25 2C25.5 3.5 25 5 24 6Z"
                fill="#C8B89F"
                stroke="#42382F"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const { openSidebar } = useSidebar();
    const { user, profile, isLoading } = useAuth();
    const { t, l } = useTranslation();

    // If query string explicitly asks for saved, route to dedicated /saved page
    useEffect(() => {
        if (tabParam === "saved") {
            router.replace(l("/saved"));
        }
    }, [tabParam, router, l]);

    // Redirect unauthenticated guests to login
    useEffect(() => {
        if (!isLoading && !user) {
            router.replace(l("/login"));
        }
    }, [isLoading, user, router, l]);

    // Dynamic user profile fields - synced directly from unified AuthContext
    const [name, setName] = useState("");
    const [status, setStatus] = useState("");
    const [tagline, setTagline] = useState("");
    const [bio, setBio] = useState("");
    const [location, setLocation] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    // Dynamic content lists
    const [createdRecipes, setCreatedRecipes] = useState<RecipeCardData[]>([]);
    const [savedCount, setSavedCount] = useState<number>(0);

    // Sync profile data from unified AuthContext
    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setStatus(profile.status || "");
            setTagline(profile.tagline || "");
            setBio(profile.bio || "");
            setLocation(profile.location || "");
            setAvatarUrl(profile.avatarUrl || "");
        }
    }, [profile]);

    // Load published recipes and saved recipe count
    useEffect(() => {
        let isMounted = true;

        async function fetchUserData() {
            if (!user) return;
            try {
                const [dbPublished, dbSaved] = await Promise.all([
                    getUserPublishedRecipesAction(user.id),
                    getUserSavedRecipesAction(),
                ]);

                if (!isMounted) return;

                if (dbPublished && dbPublished.length > 0) {
                    setCreatedRecipes(
                        dbPublished.map((r: any) => ({
                            id: r.id,
                            slug: r.slug,
                            title: r.title,
                            cookTime: r.cook_time,
                            rating: Number(r.rating) || 5.0,
                            image: r.hero_image || "/category/curries.webp",
                            category: r.category,
                            isPublished: r.is_published,
                        }))
                    );
                }

                if (dbSaved && Array.isArray(dbSaved)) {
                    setSavedCount(dbSaved.length);
                    return;
                }
            } catch (err) {
                console.warn("Supabase profile fetch fallback:", err);
            }

            // Fallback for saved count from localStorage
            try {
                const stored = localStorage.getItem("heygarlic_saved_recipes");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setSavedCount(parsed.length);
                    }
                }
            } catch {
                // ignore
            }
        }

        fetchUserData();

        // Realtime sync for published recipes
        const supabase = createClient();
        const channel = supabase
            .channel(`profile-realtime-${user?.id || "guest"}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "recipes",
                    filter: user ? `user_id=eq.${user.id}` : undefined,
                },
                () => {
                    if (user) {
                        getUserPublishedRecipesAction(user.id).then((dbRecipes) => {
                            if (isMounted && dbRecipes) {
                                setCreatedRecipes(
                                    dbRecipes.map((r: any) => ({
                                        id: r.id,
                                        slug: r.slug,
                                        title: r.title,
                                        cookTime: r.cook_time,
                                        rating: Number(r.rating) || 5.0,
                                        image: r.hero_image || "/category/curries.webp",
                                        category: r.category,
                                        isPublished: r.is_published,
                                    }))
                                );
                            }
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [user]);

    const displayInitial =
        profile?.initial ||
        (name
            ? name.charAt(0).toUpperCase()
            : user?.email
                ? user.email.charAt(0).toUpperCase()
                : "U");

    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
            {/* Top Header */}
            <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
                {/* Mobile Hamburger & Logo */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                        type="button"
                        aria-label="Open side menu"
                        onClick={openSidebar}
                        className="flex md:hidden size-10 rounded-lg border border-border/80 bg-card items-center justify-center text-foreground hover:bg-muted shadow-2xs transition-colors cursor-pointer shrink-0"
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
                        <GarlicIcon className="size-7 sm:size-8 -mt-0.5 text-foreground" />
                    </Link>
                </div>

                {/* Right Navigation Controls */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <Link
                        href={l("/recipe/create")}
                        aria-label="Add Recipe"
                        className="size-10 sm:size-11 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground hover:bg-muted shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus className="size-5 stroke-[2]" />
                    </Link>

                    <UserDropdown />
                </div>
            </header>

            {/* Main Profile Content Area */}
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col pt-8 sm:pt-12 pb-16">
                {/* Profile Hero Header */}
                <section className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 sm:gap-8 pb-8 sm:pb-10 border-b border-border/70">
                    {/* Left Avatar + User Details */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
                        {/* Profile Avatar */}
                        <div className="relative shrink-0 size-32 sm:size-36 md:size-40">
                            <Link
                                href={l("/settings?tab=edit-profile")}
                                title="Click to edit profile photo in settings"
                                className="w-full h-full rounded-full overflow-hidden border-2 border-dashed sm:border-solid border-border/90 bg-[#F7F5EE] dark:bg-muted shadow-xs flex items-center justify-center cursor-pointer group transition-all hover:ring-4 hover:ring-primary/20 relative"
                            >
                                {isLoading ? (
                                    <div className="w-full h-full bg-muted/60 animate-pulse rounded-full" />
                                ) : avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={name || "Profile Avatar"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors p-3 select-none">
                                        <span className="font-heading text-4xl sm:text-5xl font-medium text-foreground">
                                            {displayInitial}
                                        </span>
                                        <span className="text-[11px] font-medium mt-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            <Camera className="size-3" />
                                            <span>Set Photo</span>
                                        </span>
                                    </div>
                                )}

                                {/* Hover badge to change photo */}
                                {!isLoading && (
                                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-medium gap-1 pointer-events-none">
                                        <Camera className="size-5" />
                                        <span>{avatarUrl ? "Change Photo" : "Upload Photo"}</span>
                                    </div>
                                )}
                            </Link>

                            {/* Mobile Pencil Edit Icon */}
                            <Link
                                href={l("/settings?tab=edit-profile")}
                                aria-label="Edit Profile"
                                title="Edit Profile"
                                className="md:hidden absolute bottom-0.5 right-0.5 size-9 rounded-lg bg-card border-2 border-background shadow-md flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer z-10"
                            >
                                <Pencil className="size-4 text-foreground" />
                            </Link>
                        </div>

                        {/* Profile Details & Bio */}
                        <div className="flex flex-col">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                {isLoading ? (
                                    <div className="h-10 sm:h-12 w-48 sm:w-64 bg-muted/60 animate-pulse rounded-2xl mb-1" />
                                ) : (
                                    <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-normal tracking-tight text-foreground leading-[1.12]">
                                        Hello, {name || profile?.name || user?.email?.split("@")[0] || "Chef"}!
                                    </h1>
                                )}

                                {/* Status Badge */}
                                {status && (
                                    <Link
                                        href={l("/settings?tab=edit-profile")}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
                                        title="Click to change your cooking status in settings"
                                    >
                                        <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                                        <span>{status}</span>
                                    </Link>
                                )}
                            </div>

                            {/* Tagline & Location */}
                            {(tagline || location) && (
                                <p className="mt-1.5 text-sm sm:text-base font-medium text-foreground/85 flex items-center justify-center sm:justify-start gap-1.5">
                                    {tagline && <span>{tagline}</span>}
                                    {location && (
                                        <span className="text-xs text-muted-foreground font-normal">
                                            {tagline ? `• ${location}` : location}
                                        </span>
                                    )}
                                </p>
                            )}

                            {/* Bio */}
                            {bio ? (
                                <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed font-normal">
                                    {bio}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs sm:text-sm text-muted-foreground/75 italic max-w-lg leading-relaxed font-normal">
                                    No bio yet.
                                </p>
                            )}

                            {/* Stats Counters */}
                            <div className="mt-4 sm:mt-5 flex items-center justify-center sm:justify-start gap-6 sm:gap-7">
                                {/* Recipes Count */}
                                <div className="flex flex-col items-center sm:items-start">
                                    <span className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight">
                                        {createdRecipes.length}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        Recipes
                                    </span>
                                </div>

                                <div className="h-7 w-px bg-border/80" />

                                {/* Saved Count (Clickable Link to /saved) */}
                                <Link
                                    href={l("/saved")}
                                    className="flex flex-col items-center sm:items-start group/stat cursor-pointer"
                                    title="Go to Saved Recipes"
                                >
                                    <span className="font-heading text-xl sm:text-2xl font-bold text-foreground leading-tight group-hover/stat:text-primary transition-colors">
                                        {savedCount}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-normal group-hover/stat:text-foreground transition-colors">
                                        {t("profile.savedTab")}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Right Action: Edit Profile Button */}
                    <div className="hidden md:flex shrink-0 self-start items-center gap-2">
                        <Link
                            href={l("/settings?tab=edit-profile")}
                            className="rounded-lg border border-border/90 bg-card hover:bg-muted text-foreground px-3.5 py-1.5 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <Pencil className="size-3.5 sm:size-4 text-muted-foreground" />
                            <span>{t("profile.editProfile")}</span>
                        </Link>
                    </div>
                </section>

                {/* Section Navigation: My Recipes & Direct Link to /saved */}
                <section className="mt-6 sm:mt-8 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold bg-foreground text-background shadow-xs">
                            {t("profile.recipesTab")} ({createdRecipes.length})
                        </div>
                        <Link
                            href={l("/saved")}
                            className="rounded-lg px-4 py-2 text-xs sm:text-sm font-medium border border-border/80 bg-card text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                        >
                            <Bookmark className="size-3.5 text-muted-foreground" />
                            <span>{t("saved.title")} ({savedCount})</span>
                        </Link>
                    </div>
                </section>

                {/* My Recipe Creations Grid */}
                <div className="w-full flex flex-col gap-10 sm:gap-12 mt-6 sm:mt-8">
                    <section>
                        {createdRecipes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {createdRecipes.map((recipe) => (
                                    <RecipeCard
                                        key={recipe.id}
                                        id={recipe.id}
                                        slug={recipe.slug}
                                        title={recipe.title}
                                        image={recipe.image}
                                        cookTime={recipe.cookTime || 20}
                                        rating={recipe.rating}
                                        onClick={() => {
                                            if (recipe.isPublished === false) {
                                                router.push(l(`/recipe/${recipe.slug || recipe.id}/edit`));
                                            } else {
                                                router.push(l(`/recipe/${recipe.slug || recipe.id}`));
                                            }
                                        }}
                                        badge={
                                            recipe.isPublished === false ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/90 text-white dark:bg-amber-500/30 dark:text-amber-300 dark:border dark:border-amber-500/40 backdrop-blur-xs shadow-xs flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    <span>Draft</span>
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-600/90 text-white dark:bg-emerald-500/30 dark:text-emerald-300 dark:border dark:border-emerald-500/40 backdrop-blur-xs shadow-xs flex items-center gap-1">
                                                    <CheckCircle2 className="size-3" />
                                                    <span>Published</span>
                                                </span>
                                            )
                                        }
                                        actionButton={
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(l(`/recipe/${recipe.slug || recipe.id}/edit`));
                                                }}
                                                className="size-8 rounded-lg bg-card/85 backdrop-blur-xs flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer border border-border/60 hover:text-primary"
                                                title="Edit recipe"
                                                aria-label="Edit recipe"
                                            >
                                                <Pencil className="size-3.5" />
                                            </button>
                                        }
                                    />
                                ))}
                            </div>
                        ) : (
                            /* Welcoming Empty State for New User */
                            <div className="rounded-3xl border border-dashed border-border/90 bg-card/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                                <div className="relative size-48 sm:size-56 md:size-64 mb-3 sm:mb-4 select-none pointer-events-none">
                                    <Image
                                        src="/images/no-recipes.webp"
                                        alt="No recipes published yet"
                                        fill
                                        sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
                                        className="object-contain block dark:hidden"
                                        priority
                                    />
                                    <Image
                                        src="/images/no-recipes.webp"
                                        alt="No recipes published yet"
                                        fill
                                        sizes="(max-width: 640px) 192px, (max-width: 768px) 224px, 256px"
                                        className="object-contain hidden dark:block"
                                        priority
                                    />
                                </div>
                                <h3 className="font-heading text-xl sm:text-2xl font-normal text-foreground">
                                    {t("profile.noPublishedTitle")}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => router.push(l("/recipe/create"))}
                                    className="mt-5 rounded-xl bg-foreground text-background px-5 py-2.5 text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2 shadow-2xs"
                                >
                                    <Plus className="size-4" />
                                    <span>{t("profile.createFirstRecipe")}</span>
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <ProfileContent />
        </Suspense>
    );
}
