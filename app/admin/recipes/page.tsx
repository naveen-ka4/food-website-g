"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminRecipesAction,
  toggleRecipePublishAction,
  deleteRecipeAdminAction,
  getAdminCategoriesAction,
} from "@/app/actions/admin";

export default function AdminRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [isPending, startTransition] = useTransition();

  const fetchRecipes = async (currentPage = page) => {
    setLoading(true);
    const res = await getAdminRecipesAction({
      page: currentPage,
      limit: 15,
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      sortBy: "created_at",
      sortOrder: "desc",
    });

    if (res.success) {
      setRecipes(res.recipes || []);
      setTotal(res.total || 0);
      setPage(res.page);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.error(res.error || "Failed to load recipes.");
    }
    setLoading(false);
  };

  useEffect(() => {
    // Load categories for filter dropdown
    getAdminCategoriesAction().then((res) => {
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipes(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, categoryFilter]);

  const handleToggleStatus = (recipeId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const nextStatus = !currentStatus;
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, is_published: nextStatus } : r))
      );

      const res = await toggleRecipePublishAction(recipeId, nextStatus);
      if (res.success) {
        toast.success(nextStatus ? "Recipe published!" : "Recipe converted to draft.");
      } else {
        toast.error(res.error || "Failed to update recipe.");
        fetchRecipes(page);
      }
    });
  };

  const handleDelete = (recipeId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }

    startTransition(async () => {
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      const res = await deleteRecipeAdminAction(recipeId);
      if (res.success) {
        toast.success(`"${title}" deleted successfully.`);
        fetchRecipes(page);
      } else {
        toast.error(res.error || "Failed to delete recipe.");
        fetchRecipes(page);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            Recipe Catalog
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full inventory of all community and staff recipes, AI safety indices, and publication statuses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRecipes(page)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted/70 transition-all text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/recipe/create"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
          >
            <Plus className="size-3.5" />
            Add Recipe
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search recipes by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/50 border border-border text-foreground focus:outline-none"
            >
              <option value="all">All ({total})</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/50 border border-border text-foreground focus:outline-none max-w-[150px] truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                <th className="py-3.5 px-4">Recipe</th>
                <th className="py-3.5 px-4">Author</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">AI Score</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading recipes...
                  </td>
                </tr>
              ) : recipes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No recipes match your criteria.
                  </td>
                </tr>
              ) : (
                recipes.map((recipe) => {
                  const score = typeof recipe.ai_score === "number" ? recipe.ai_score : 0.95;
                  const isSafe = score >= 0.7;

                  return (
                    <tr
                      key={recipe.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Recipe Image & Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-[220px] max-w-[320px]">
                          {recipe.hero_image ? (
                            <img
                              src={recipe.hero_image}
                              alt={recipe.title}
                              className="size-11 rounded-lg object-cover shrink-0 border border-border"
                            />
                          ) : (
                            <div className="size-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <UtensilsCrossed className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block leading-snug">
                              {recipe.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block font-mono">
                              /{recipe.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-3 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {recipe.profiles?.full_name || recipe.profiles?.username || "Unknown"}
                        {recipe.profiles?.is_banned && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] bg-red-500/10 text-red-500 font-semibold">
                            Banned
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border">
                          {recipe.category}
                        </span>
                      </td>

                      {/* AI Score */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            isSafe
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isSafe ? (
                            <ShieldCheck className="size-3" />
                          ) : (
                            <ShieldAlert className="size-3" />
                          )}
                          {Math.round(score * 100)}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-[10px] ${
                            recipe.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : recipe.status === "rejected"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {recipe.status === "approved" && <CheckCircle2 className="size-3" />}
                          {recipe.status === "pending" && <Clock className="size-3" />}
                          {recipe.status || "draft"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(recipe.created_at).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/inspect/${recipe.id}`}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                            title="Inspect & Moderation Dossier"
                          >
                            <Sparkles className="size-4" />
                          </Link>
                          <Link
                            href={`/recipe/${recipe.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="View public recipe"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <Link
                            href={`/recipe/${recipe.id}/edit`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit recipe"
                          >
                            <Edit className="size-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(recipe.id, recipe.title)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete recipe"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {recipes.length} of {total} recipes
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prev = page - 1;
                setPage(prev);
                fetchRecipes(prev);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="font-semibold text-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = page + 1;
                setPage(next);
                fetchRecipes(next);
              }}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
