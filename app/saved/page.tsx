"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Menu,
    Plus,
    Search,
    X,
    Trash2,
    Pencil,
    Check,
    Folder,
    FolderPlus,
    ArrowLeft,
    Bookmark,
    Utensils,
    Star,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/Sidebar";
import { UserDropdown } from "@/components/UserDropdown";
import { RecipeCard } from "@/components/RecipeCard";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n/context";
import {
    getUserSavedRecipesAction,
    toggleSaveRecipeAction,
    getUserBoardsAction,
    createBoardAction,
    updateBoardAction,
    deleteBoardAction,
    toggleRecipeInBoardAction,
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
}

export interface RecipeBoard {
    id: string;
    name: string;
    description?: string;
    recipeIds: string[];
    createdAt: string;
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
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function PinterestBoardCard({
    board,
    savedRecipes,
    onClick,
    onDelete,
}: {
    board: RecipeBoard;
    savedRecipes: RecipeCardData[];
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}) {
    const { t } = useTranslation();
    const boardRecipes = savedRecipes.filter((r) => board.recipeIds.includes(r.id));
    const img1 = boardRecipes[0]?.image;
    const img2 = boardRecipes[1]?.image;
    const img3 = boardRecipes[2]?.image;

    return (
        <div
            onClick={onClick}
            className="group cursor-pointer flex flex-col gap-2.5 transition-colors select-none"
        >
            {/* Pinterest Signature 3-Slot Collage Container */}
            <div className="relative aspect-[16/11] w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-card border border-border/80 group-hover:border-primary/50 transition-colors">
                {boardRecipes.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5 bg-muted/30">
                        <Folder className="size-8 stroke-[1.5] text-muted-foreground/50" />
                        <span className="text-xs font-medium">{t("saved.emptyBoard")}</span>
                    </div>
                ) : boardRecipes.length === 1 ? (
                    <div className="w-full h-full relative overflow-hidden bg-muted">
                        <img
                            src={img1}
                            alt={board.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : boardRecipes.length === 2 ? (
                    <div className="w-full h-full grid grid-cols-2 gap-0.5 sm:gap-1 bg-border/40 p-0.5">
                        <div className="relative h-full overflow-hidden rounded-l-xl bg-muted">
                            <img
                                src={img1}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="relative h-full overflow-hidden rounded-r-xl bg-muted">
                            <img
                                src={img2}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full grid grid-cols-3 gap-0.5 sm:gap-1 bg-border/40 p-0.5">
                        <div className="col-span-2 h-full relative overflow-hidden rounded-l-xl bg-muted">
                            <img
                                src={img1}
                                alt={board.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="col-span-1 h-full grid grid-rows-2 gap-0.5 sm:gap-1">
                            <div className="relative overflow-hidden rounded-tr-xl bg-muted">
                                <img
                                    src={img2}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="relative overflow-hidden rounded-br-xl bg-muted">
                                <img
                                    src={img3}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete button on hover */}
                <button
                    type="button"
                    onClick={onDelete}
                    title={t("saved.deleteBoardButton")}
                    className="absolute top-2.5 right-2.5 size-7 rounded-lg bg-background/85 hover:bg-destructive hover:text-destructive-foreground backdrop-blur-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer shadow-xs z-10"
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>

            {/* Title & Info */}
            <div className="px-1 flex items-start justify-between">
                <div className="min-w-0">
                    <h3 className="font-heading font-medium text-base sm:text-lg text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                        {board.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {boardRecipes.length === 1 ? t("saved.recipeCountSingle") : t("saved.recipeCountMultiple", { count: boardRecipes.length })}
                    </p>
                </div>
            </div>
        </div>
    );
}

function SavedContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t, l } = useTranslation();
    const boardParam = searchParams.get("board");
    const { openSidebar } = useSidebar();
    const { user, isLoading: isAuthLoading } = useAuth();

    const [savedRecipes, setSavedRecipes] = useState<RecipeCardData[]>([]);
    const [boards, setBoards] = useState<RecipeBoard[]>([]);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(boardParam || null);
    const [savedSearchQuery, setSavedSearchQuery] = useState("");
    const [savedViewMode, setSavedViewMode] = useState<"boards" | "all">("boards");
    const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");
    const [newBoardDesc, setNewBoardDesc] = useState("");
    const [isSelectRecipesOpen, setIsSelectRecipesOpen] = useState(false);

    // Board Editing State
    const [isEditingBoard, setIsEditingBoard] = useState(false);
    const [editBoardName, setEditBoardName] = useState("");
    const [editBoardDesc, setEditBoardDesc] = useState("");

    // Board Deletion State
    const [boardToDelete, setBoardToDelete] = useState<{ id: string; name: string } | null>(null);

    // Unsave Recipe Confirmation State
    const [recipeToUnsave, setRecipeToUnsave] = useState<{
        id: string;
        title: string;
        boardNames: string[];
    } | null>(null);

    const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

    const getBoardsStorageKey = () => `heygarlic_boards_${user?.id || "guest"}`;

    // Load Pinterest Boards from Supabase (with localStorage fallback for guests)
    useEffect(() => {
        let isMounted = true;

        async function fetchBoards() {
            if (user) {
                try {
                    const dbBoards = await getUserBoardsAction();
                    if (!isMounted) return;
                    if (dbBoards && dbBoards.length > 0) {
                        setBoards(dbBoards);
                        return;
                    }
                } catch (err) {
                    console.warn("Supabase boards fetch error:", err);
                }
            }

            try {
                const stored = localStorage.getItem(getBoardsStorageKey());
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        setBoards(parsed);
                        return;
                    }
                }
            } catch {
                // ignore
            }
            setBoards([]);
        }

        fetchBoards();

        return () => {
            isMounted = false;
        };
    }, [user?.id]);

    const saveBoards = (nextBoards: RecipeBoard[]) => {
        setBoards(nextBoards);
        try {
            localStorage.setItem(getBoardsStorageKey(), JSON.stringify(nextBoards));
        } catch {
            // ignore
        }
    };

    // Load saved recipes from Supabase with localStorage fallbacks
    useEffect(() => {
        let isMounted = true;

        async function fetchSavedRecipes() {
            if (user) {
                try {
                    const dbSaved = await getUserSavedRecipesAction();
                    if (!isMounted) return;

                    if (dbSaved && dbSaved.length > 0) {
                        setSavedRecipes(
                            dbSaved.map((r: any) => ({
                                id: r.id,
                                title: r.title,
                                cookTime: r.cook_time,
                                rating: Number(r.rating) || 5.0,
                                image: r.hero_image || "/recipes/creamy-pasta.jpg",
                                category: r.category,
                                isSaved: true,
                            }))
                        );
                        return;
                    }
                } catch (err) {
                    console.warn("Supabase saved fetch error:", err);
                }
            }

            // Fallback to localStorage
            try {
                const stored = localStorage.getItem("heygarlic_saved_recipes");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSavedRecipes(parsed);
                        return;
                    }
                }
                setSavedRecipes([]);
            } catch {
                setSavedRecipes([]);
            }
        }

        fetchSavedRecipes();

        // Realtime sync for saved_recipes
        const supabase = createClient();
        const channel = supabase
            .channel(`saved-realtime-${user?.id || "guest"}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "saved_recipes",
                    filter: user ? `user_id=eq.${user.id}` : undefined,
                },
                () => {
                    getUserSavedRecipesAction().then((dbSaved) => {
                        if (isMounted && dbSaved) {
                            setSavedRecipes(
                                dbSaved.map((r: any) => ({
                                    id: r.id,
                                    title: r.title,
                                    cookTime: r.cook_time,
                                    rating: Number(r.rating) || 5.0,
                                    image: r.hero_image || "/recipes/creamy-pasta.jpg",
                                    category: r.category,
                                    isSaved: true,
                                }))
                            );
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [user]);

    const handleStartEditingBoard = (currentBoard: RecipeBoard) => {
        setEditBoardName(currentBoard.name);
        setEditBoardDesc(currentBoard.description || "");
        setIsEditingBoard(true);
    };

    const handleFinishEditingBoard = async (boardId: string) => {
        const trimmed = editBoardName.trim();
        if (!trimmed) {
            toast.error("Board name cannot be empty");
            return;
        }

        if (user) {
            await updateBoardAction({
                id: boardId,
                name: trimmed,
                description: editBoardDesc.trim() || undefined,
            });
        }

        const nextBoards = boards.map((b) =>
            b.id === boardId
                ? { ...b, name: trimmed, description: editBoardDesc.trim() || undefined }
                : b
        );
        saveBoards(nextBoards);
        setIsEditingBoard(false);
        toast.success("Board details updated! ✨");
    };

    const handleCancelEditingBoard = () => {
        setIsEditingBoard(false);
    };

    const handleCreateBoard = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newBoardName.trim();
        if (!trimmed) {
            toast.error("Please enter a board name");
            return;
        }

        if (user) {
            const res = await createBoardAction({
                name: trimmed,
                description: newBoardDesc.trim() || undefined,
            });
            if (res.success && res.board) {
                setBoards([res.board, ...boards]);
                setIsCreateBoardOpen(false);
                setNewBoardName("");
                setNewBoardDesc("");
                toast.success(`Board "${trimmed}" created! 📌`);
                return;
            }
        }

        const newBoard: RecipeBoard = {
            id: `board-${Date.now()}`,
            name: trimmed,
            description: newBoardDesc.trim() || undefined,
            recipeIds: [],
            createdAt: new Date().toISOString(),
        };
        const next = [...boards, newBoard];
        saveBoards(next);
        setIsCreateBoardOpen(false);
        setNewBoardName("");
        setNewBoardDesc("");
        toast.success(`Board "${trimmed}" created! 📌`);
    };

    const handleDeleteBoard = (boardId: string, boardName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setBoardToDelete({ id: boardId, name: boardName });
    };

    const confirmDeleteBoard = async (boardId: string, boardName: string) => {
        if (user) {
            await deleteBoardAction(boardId);
        }
        const next = boards.filter((b) => b.id !== boardId);
        saveBoards(next);
        if (activeBoardId === boardId) {
            setActiveBoardId(null);
            setIsEditingBoard(false);
        }
        setBoardToDelete(null);
        toast.info(`Board "${boardName}" deleted`);
    };

    const handleToggleRecipeInBoard = async (boardId: string, recipeId: string) => {
        const board = boards.find((b) => b.id === boardId);
        if (!board) return;
        const exists = board.recipeIds.includes(recipeId);

        if (user) {
            await toggleRecipeInBoardAction(boardId, recipeId);
        }

        const updatedIds = exists
            ? board.recipeIds.filter((id) => id !== recipeId)
            : [...board.recipeIds, recipeId];
        const next = boards.map((b) =>
            b.id === boardId ? { ...b, recipeIds: updatedIds } : b
        );
        saveBoards(next);
        toast.success(exists ? `Removed from "${board.name}"` : `Added to "${board.name}"! 📌`);
    };

    const handleRemoveSavedRecipe = (recipeId: string, recipeTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();

        const containingBoards = boards.filter((b) => b.recipeIds.includes(recipeId));
        if (containingBoards.length > 0) {
            setRecipeToUnsave({
                id: recipeId,
                title: recipeTitle,
                boardNames: containingBoards.map((b) => b.name),
            });
            return;
        }

        executeUnsaveRecipe(recipeId, recipeTitle);
    };

    const executeUnsaveRecipe = async (recipeId: string, recipeTitle: string) => {
        const updated = savedRecipes.filter((r) => r.id !== recipeId);
        setSavedRecipes(updated);

        const updatedBoards = boards.map((b) => ({
            ...b,
            recipeIds: b.recipeIds.filter((id) => id !== recipeId),
        }));
        saveBoards(updatedBoards);

        try {
            localStorage.setItem("heygarlic_saved_recipes", JSON.stringify(updated));
            await toggleSaveRecipeAction(recipeId);
        } catch {
            // ignore
        }
        setRecipeToUnsave(null);
        toast.success(`Removed "${recipeTitle}" from Saved Recipes`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
            {/* Top Navigation Header - Hidden when viewing inside a specific board */}
            {!activeBoardId && (
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
            )}

            {/* Main Saved Recipes & Boards Content Area (NO Profile Items!) */}
            <main className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col ${activeBoardId ? "pt-6 sm:pt-10" : "pt-8 sm:pt-10"} pb-16`}>
                <section className="flex flex-col gap-6 sm:gap-8">
                    {/* Saved Toolbar: Search Bar + Filter Switcher + New Board Button */}
                    {!activeBoardId && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pb-2">
                            {/* In-page Search Bar */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <input
                                    type="text"
                                    value={savedSearchQuery}
                                    onChange={(e) => setSavedSearchQuery(e.target.value)}
                                    placeholder={t("saved.searchPlaceholder")}
                                    className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-lg border border-border/70 bg-card text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors search-bar-glow"
                                />
                                {savedSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSavedSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Right Controls: Filter Switcher & + New Board Button */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
                                {!savedSearchQuery && (
                                    <div className="inline-flex items-center rounded-lg border border-border/80 bg-card p-1 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setSavedViewMode("boards")}
                                            className={`rounded-md px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${savedViewMode === "boards"
                                                ? "bg-foreground text-background shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {t("saved.collections")} ({boards.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSavedViewMode("all")}
                                            className={`rounded-md px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${savedViewMode === "all"
                                                ? "bg-foreground text-background shadow-xs font-semibold"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {t("saved.allSaved")} ({savedRecipes.length})
                                        </button>
                                    </div>
                                )}

                                {/* + New Board Button */}
                                <button
                                    type="button"
                                    onClick={() => user ? setIsCreateBoardOpen(true) : setShowSignInModal(true)}
                                    className="rounded-lg bg-foreground text-background hover:opacity-90 px-4 py-2 text-xs sm:text-sm font-medium transition-opacity shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto sm:ml-0"
                                    title="Create a new board"
                                >
                                    <Plus className="size-4 stroke-[2]" />
                                    <span>{t("saved.newBoardButton")}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* View 1: Active Board Detail View */}
                    {activeBoardId ? (
                        (() => {
                            const currentBoard = boards.find((b) => b.id === activeBoardId);
                            if (!currentBoard) {
                                setActiveBoardId(null);
                                return null;
                            }
                            const boardRecipes = savedRecipes.filter((r) =>
                                currentBoard.recipeIds.includes(r.id)
                            );

                            return (
                                <div className="flex flex-col gap-6 sm:gap-8">
                                    {isEditingBoard ? (
                                        /* EDIT MODE: Form fields to edit board details */
                                        <div className="flex flex-col gap-4 pb-5 border-b border-border/70">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                                    <Pencil className="size-3.5" />
                                                    <span>{t("saved.editingBoardTitle")}</span>
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleCancelEditingBoard}
                                                        className="rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                                                    >
                                                        {t("common.cancel")}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleFinishEditingBoard(currentBoard.id)}
                                                        className="rounded-xl bg-foreground text-background hover:opacity-90 px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-opacity cursor-pointer"
                                                    >
                                                        <Check className="size-3.5 stroke-[2.5]" />
                                                        <span>{t("common.saveChanges")}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Board Name Input */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-foreground">
                                                    {t("saved.boardNameLabel")} <span className="text-destructive">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editBoardName}
                                                    onChange={(e) => setEditBoardName(e.target.value)}
                                                    placeholder={t("saved.boardNamePlaceholder")}
                                                    className="w-full max-w-lg px-3.5 py-2 text-base sm:text-lg font-heading font-medium rounded-xl border border-border/90 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
                                                    autoFocus
                                                />
                                            </div>

                                            {/* Board Description Textarea */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-medium text-foreground">
                                                    {t("saved.descriptionLabel")}
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={editBoardDesc}
                                                    onChange={(e) => setEditBoardDesc(e.target.value)}
                                                    placeholder={t("saved.boardDescPlaceholder")}
                                                    className="w-full max-w-xl px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/90 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors resize-none"
                                                />
                                            </div>

                                            {/* Remove Icon Enabled Banner */}
                                            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/25 px-3.5 py-2 rounded-xl">
                                                <Trash2 className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <span>
                                                    {t("saved.removeModeActiveNotice")}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        /* VIEW MODE: Clean board title, count & action buttons */
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/70">
                                            <div className="flex flex-col gap-1.5 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveBoardId(null);
                                                        setIsEditingBoard(false);
                                                    }}
                                                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground mb-1 cursor-pointer transition-colors group w-fit"
                                                >
                                                    <ArrowLeft className="size-4" />
                                                    <span>{t("saved.backToBoards")}</span>
                                                </button>
                                                <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-normal text-foreground flex items-center gap-2.5">
                                                    <span className="truncate">{currentBoard.name}</span>
                                                </h1>
                                                {currentBoard.description && (
                                                    <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                                                        {currentBoard.description}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                                                    <span className="font-semibold text-foreground">{boardRecipes.length}</span>
                                                    <span>{boardRecipes.length === 1 ? t("saved.recipeSavedOne") : t("saved.recipeSavedCount", { count: boardRecipes.length })}</span>
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                                                {/* Edit Board Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEditingBoard(currentBoard)}
                                                    className="rounded-xl border border-border/90 bg-card hover:bg-muted text-foreground px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                                    title="Edit board name and remove recipes"
                                                >
                                                    <Pencil className="size-3.5 text-muted-foreground" />
                                                    <span>{t("saved.editBoardButton")}</span>
                                                </button>

                                                {/* Add Recipes Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => setIsSelectRecipesOpen(true)}
                                                    className="rounded-xl bg-foreground text-background hover:opacity-90 px-4 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-xs transition-opacity cursor-pointer"
                                                >
                                                    <Plus className="size-4 stroke-[2]" />
                                                    <span>{t("saved.addRecipesButton")}</span>
                                                </button>

                                                {/* Delete Board Button */}
                                                <button
                                                    type="button"
                                                    onClick={(e) =>
                                                        handleDeleteBoard(currentBoard.id, currentBoard.name, e)
                                                    }
                                                    className="rounded-xl border border-border/90 bg-card hover:bg-destructive hover:text-destructive-foreground text-muted-foreground p-2.5 text-xs shadow-2xs transition-colors cursor-pointer"
                                                    title="Delete Board"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recipes in this Board */}
                                    {boardRecipes.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                            {boardRecipes.map((recipe) => (
                                                <RecipeCard
                                                    key={recipe.id}
                                                    id={recipe.id}
                                                    slug={recipe.slug}
                                                    title={recipe.title}
                                                    image={recipe.image}
                                                    cookTime={recipe.cookTime || 20}
                                                    rating={recipe.rating || 5.0}
                                                    isSaved={true}
                                                    actionButton={
                                                        isEditingBoard ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleToggleRecipeInBoard(currentBoard.id, recipe.id);
                                                                }}
                                                                title="Remove from board"
                                                                className="size-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors cursor-pointer"
                                                            >
                                                                <X className="size-4 stroke-[2.5]" />
                                                            </button>
                                                        ) : undefined
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                                            <Folder className="size-12 text-muted-foreground/50 mb-3 stroke-[1.5]" />
                                            <h3 className="font-heading text-lg font-medium text-foreground">
                                                {t("saved.noRecipesInBoardTitle")}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                                {t("saved.noRecipesInBoardHint")}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setIsSelectRecipesOpen(true)}
                                                className="mt-4 rounded-xl bg-foreground text-background px-4 py-2 text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Plus className="size-4" />
                                                <span>{t("saved.addRecipesButton")}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : savedSearchQuery ? (
                        /* View 2: In-Page Search Results */
                        (() => {
                            const q = savedSearchQuery.toLowerCase().trim();
                            const matchedBoards = boards.filter(
                                (b) =>
                                    b.name.toLowerCase().includes(q) ||
                                    b.description?.toLowerCase().includes(q)
                            );
                            const matchedRecipes = savedRecipes.filter(
                                (r) =>
                                    r.title.toLowerCase().includes(q) ||
                                    r.category?.toLowerCase().includes(q)
                            );

                            const hasResults = matchedBoards.length > 0 || matchedRecipes.length > 0;

                            if (!hasResults) {
                                return (
                                    <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                                        <Search className="size-10 text-muted-foreground/40 mb-3 stroke-[1.5]" />
                                        <h3 className="font-heading text-lg font-medium text-foreground">
                                            {t("saved.noResultsForQuery", { query: savedSearchQuery })}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("saved.noResultsHint")}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setSavedSearchQuery("")}
                                            className="mt-4 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                                        >
                                            {t("saved.clearSearchButton")}
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <div className="flex flex-col gap-8">
                                    {/* Matching Boards */}
                                    {matchedBoards.length > 0 && (
                                        <div className="flex flex-col gap-4">
                                            <h3 className="font-heading text-lg sm:text-xl font-medium text-foreground">
                                                {t("saved.boardsCountHeading", { count: matchedBoards.length })}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                                {matchedBoards.map((board) => (
                                                    <PinterestBoardCard
                                                        key={board.id}
                                                        board={board}
                                                        savedRecipes={savedRecipes}
                                                        onClick={() => setActiveBoardId(board.id)}
                                                        onDelete={(e) =>
                                                            handleDeleteBoard(board.id, board.name, e)
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Matching Recipes */}
                                    {matchedRecipes.length > 0 && (
                                        <div className="flex flex-col gap-4">
                                            <h3 className="font-heading text-lg sm:text-xl font-medium text-foreground">
                                                {t("saved.title")} ({matchedRecipes.length})
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                                {matchedRecipes.map((recipe) => (
                                                    <RecipeCard
                                                        key={recipe.id}
                                                        id={recipe.id}
                                                        slug={recipe.slug}
                                                        title={recipe.title}
                                                        image={recipe.image}
                                                        cookTime={recipe.cookTime || 20}
                                                        rating={recipe.rating || 5.0}
                                                        isSaved={true}
                                                        onToggleSave={(id, title, e) =>
                                                            handleRemoveSavedRecipe(id, title, e)
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : savedViewMode === "boards" ? (
                        /* View 3: Pinterest Boards Only View */
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-heading text-lg sm:text-xl font-medium text-foreground flex items-center gap-2">
                                    <span>{t("saved.boardsHeading")}</span>
                                    <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-lg bg-muted">
                                        {boards.length}
                                    </span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {boards.map((board) => (
                                    <PinterestBoardCard
                                        key={board.id}
                                        board={board}
                                        savedRecipes={savedRecipes}
                                        onClick={() => setActiveBoardId(board.id)}
                                        onDelete={(e) =>
                                            handleDeleteBoard(board.id, board.name, e)
                                        }
                                    />
                                ))}

                                {/* Create Board Dashed Card at the end */}
                                <div
                                    onClick={() => setIsCreateBoardOpen(true)}
                                    className="group rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-card/40 hover:bg-card flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors min-h-[180px] sm:min-h-[220px]"
                                >
                                    <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2.5 shadow-2xs">
                                        <Plus className="size-5 stroke-[2]" />
                                    </div>
                                    <span className="font-heading text-base font-medium text-foreground">
                                        {t("saved.createBoard")}
                                    </span>
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                        {t("saved.organizeSaves")}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* View 4: All Saves View */
                        <div className="flex flex-col gap-4">
                            {savedRecipes.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                    {savedRecipes.map((recipe) => (
                                        <RecipeCard
                                            key={recipe.id}
                                            id={recipe.id}
                                            slug={recipe.slug}
                                            title={recipe.title}
                                            image={recipe.image}
                                            cookTime={recipe.cookTime || 20}
                                            rating={recipe.rating || 5.0}
                                            isSaved={true}
                                            onToggleSave={(id, title, e) =>
                                                handleRemoveSavedRecipe(id, title, e)
                                            }
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-border/90 bg-card/40 p-8 sm:p-12 text-center flex flex-col items-center justify-center">
                                    <Utensils className="size-10 text-muted-foreground/40 mb-3 stroke-[1.5]" />
                                    <h3 className="font-heading text-xl font-normal text-foreground">
                                        {t("saved.noSavedTitle")}
                                    </h3>
                                    <Link
                                        href={l("/search")}
                                        className="mt-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground px-5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 shadow-2xs"
                                    >
                                        <Utensils className="size-4" />
                                        <span>{t("saved.discoverButton")}</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create Board Modal */}
                    {isCreateBoardOpen && (
                        <div
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                            onClick={() => setIsCreateBoardOpen(false)}
                        >
                            <div
                                className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-in fade-in duration-150"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                                    <div className="flex items-center gap-2">
                                        <FolderPlus className="size-5 text-primary" />
                                        <h3 className="font-heading text-xl font-medium text-foreground">
                                            {t("saved.createBoardModalTitle")}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateBoardOpen(false)}
                                        className="size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateBoard} className="flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-foreground block mb-1.5">
                                            {t("saved.boardNameLabel")} <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            value={newBoardName}
                                            onChange={(e) => setNewBoardName(e.target.value)}
                                            placeholder={t("saved.boardNamePlaceholder")}
                                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-border/80 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-foreground block mb-1.5">
                                            {t("saved.descriptionLabel")}
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={newBoardDesc}
                                            onChange={(e) => setNewBoardDesc(e.target.value)}
                                            placeholder={t("saved.boardDescPlaceholder")}
                                            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-border/80 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2.5 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCreateBoardOpen(false);
                                                setNewBoardName("");
                                                setNewBoardDesc("");
                                            }}
                                            className="rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground px-4 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                                        >
                                            {t("common.cancel")}
                                        </button>
                                        <button
                                            type="submit"
                                            className="rounded-xl bg-foreground text-background hover:opacity-90 px-5 py-2 text-xs sm:text-sm font-medium transition-opacity cursor-pointer shadow-xs"
                                        >
                                            {t("saved.createBoardSubmit")}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Delete Board Confirmation Modal */}
                    {boardToDelete && (
                        <div
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                            onClick={() => setBoardToDelete(null)}
                        >
                            <div
                                className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in duration-150"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="size-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
                                    <Trash2 className="size-7 stroke-[2]" />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <h3 className="font-heading text-xl sm:text-2xl font-medium text-foreground">
                                        {t("saved.deleteBoardButton")}?
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                                        Are you sure you want to delete <strong className="text-foreground font-semibold">&ldquo;{boardToDelete.name}&rdquo;</strong>?
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/75 mt-0.5">
                                        Saved recipes in this board will remain safe in your collection.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5 w-full mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setBoardToDelete(null)}
                                        className="flex-1 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => confirmDeleteBoard(boardToDelete.id, boardToDelete.name)}
                                        className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 py-2.5 text-xs sm:text-sm font-medium transition-opacity shadow-xs cursor-pointer"
                                    >
                                        {t("saved.deleteBoardButton")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Unsave Recipe Confirmation Modal */}
                    {recipeToUnsave && (
                        <div
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                            onClick={() => setRecipeToUnsave(null)}
                        >
                            <div
                                className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-4 animate-in fade-in duration-150"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Bookmark className="size-7 fill-amber-500/30 stroke-[2]" />
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <h3 className="font-heading text-xl sm:text-2xl font-medium text-foreground">
                                        Remove from Saved?
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        <strong className="text-foreground font-semibold">&ldquo;{recipeToUnsave.title}&rdquo;</strong> is currently saved in your board{recipeToUnsave.boardNames.length > 1 ? "s" : ""}:
                                    </p>

                                    <div className="flex flex-wrap items-center justify-center gap-1.5 py-1.5 max-h-24 overflow-y-auto">
                                        {recipeToUnsave.boardNames.map((name) => (
                                            <span
                                                key={name}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-muted border border-border/80 text-foreground"
                                            >
                                                <Folder className="size-3 text-primary" />
                                                <span>{name}</span>
                                            </span>
                                        ))}
                                    </div>

                                    <p className="text-[11px] text-muted-foreground/80 mt-1">
                                        Unsaving will also remove this recipe from {recipeToUnsave.boardNames.length > 1 ? "all these boards" : "this board"}. Are you sure?
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5 w-full mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRecipeToUnsave(null)}
                                        className="flex-1 rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                                    >
                                        {t("saved.keepSavedButton")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => executeUnsaveRecipe(recipeToUnsave.id, recipeToUnsave.title)}
                                        className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 py-2.5 text-xs sm:text-sm font-medium transition-opacity shadow-xs cursor-pointer"
                                    >
                                        {t("saved.unsaveRecipeButton")}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Select Recipes to Add into Active Board Modal */}
                    {isSelectRecipesOpen && activeBoardId && (
                        (() => {
                            const curBoard = boards.find((b) => b.id === activeBoardId);
                            if (!curBoard) return null;
                            return (
                                <div
                                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                                    onClick={() => setIsSelectRecipesOpen(false)}
                                >
                                    <div
                                        className="bg-card border border-border rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in duration-150"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-border/70">
                                            <div>
                                                <h3 className="font-heading text-lg sm:text-xl font-medium text-foreground">
                                                    {t("saved.selectRecipesModalTitle")}
                                                </h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {t("saved.selectRecipesModalDesc")}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsSelectRecipesOpen(false)}
                                                className="size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[50vh] pr-1">
                                            {savedRecipes.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-8">
                                                    No saved recipes to add. Save some recipes first!
                                                </p>
                                            ) : (
                                                savedRecipes.map((recipe) => {
                                                    const inBoard = curBoard.recipeIds.includes(recipe.id);
                                                    return (
                                                        <div
                                                            key={recipe.id}
                                                            onClick={() =>
                                                                handleToggleRecipeInBoard(curBoard.id, recipe.id)
                                                            }
                                                            className={`flex items-center justify-between p-2.5 rounded-2xl border transition-colors cursor-pointer ${inBoard
                                                                ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                                                                : "border-border/70 hover:bg-muted/50"
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="size-12 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                                                                    <img
                                                                        src={recipe.image || "/recipes/creamy-pasta.jpg"}
                                                                        alt={recipe.title}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs sm:text-sm font-medium text-foreground truncate">
                                                                        {recipe.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                                        <span>{recipe.cookTime || 20} min</span>
                                                                        <span>•</span>
                                                                        <span className="flex items-center gap-0.5 text-yellow-500 font-semibold">
                                                                            <Star className="size-2.5 fill-yellow-400 text-yellow-400" />
                                                                            {recipe.rating || 5}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div
                                                                className={`size-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${inBoard
                                                                    ? "bg-primary border-primary text-primary-foreground"
                                                                    : "border-border text-transparent"
                                                                    }`}
                                                            >
                                                                <Check className="size-3.5 stroke-[3]" />
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        <div className="pt-3 border-t border-border/70 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setIsSelectRecipesOpen(false)}
                                                className="rounded-xl bg-foreground text-background hover:opacity-90 px-5 py-2 text-xs sm:text-sm font-medium transition-opacity cursor-pointer shadow-xs"
                                            >
                                                {t("saved.doneButton")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </section>
            </main>

            <SignInPromptModal
                isOpen={showSignInModal}
                onClose={() => setShowSignInModal(false)}
                title={t("saved.signInToCreateBoards")}
                description={t("saved.signInToCreateBoardsDesc")}
            />
        </div>
    );
}

export default function SavedPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <SavedContent />
        </Suspense>
    );
}
