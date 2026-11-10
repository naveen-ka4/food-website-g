"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Check,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getReviewQueueAction,
  approveRecipeAction,
  rejectRecipeAction,
  getAdminStatsAction,
  AdminStats,
} from "@/app/actions/admin";

export default function AdminReviewQueuePage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [aiProvider, setAiProvider] = useState<{ provider: string; model: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Status Filter: "pending" | "approved" | "rejected" | "all"
  const [statusTab, setStatusTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [searchTerm, setSearchTerm] = useState("");

  // Rejection Dialog State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRecipe, setTargetRecipe] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [isPending, startTransition] = useTransition();

  const loadQueue = async () => {
    setLoading(true);
    const [queueRes, statsRes] = await Promise.all([
      getReviewQueueAction({
        status: statusTab,
        search: searchTerm,
        page: 1,
        limit: 25,
      }),
      getAdminStatsAction(),
    ]);

    if (queueRes.success) {
      setRecipes(queueRes.recipes || []);
      setTotal(queueRes.total || 0);
    } else {
      toast.error(queueRes.error || "Failed to load review queue.");
    }

    if (statsRes.success && statsRes.stats) {
      setStats(statsRes.stats);
      if ((statsRes as any).aiProvider) {
        setAiProvider((statsRes as any).aiProvider);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadQueue();
    }, 250);
    return () => clearTimeout(timer);
  }, [statusTab, searchTerm]);

  const handleQuickApprove = (recipeId: string, title: string) => {
    startTransition(async () => {
      // Optimistic update
      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      const res = await approveRecipeAction(recipeId);
      if (res.success) {
        toast.success(`"${title}" approved & published!`);
        loadQueue();
      } else {
        toast.error(res.error || "Failed to approve recipe.");
        loadQueue();
      }
    });
  };

  const openRejectDialog = (recipe: { id: string; title: string }) => {
    setTargetRecipe(recipe);
    setRejectReason("Missing ingredient measurements or incomplete cooking steps.");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!targetRecipe || !rejectReason.trim()) return;

    startTransition(async () => {
      setRecipes((prev) => prev.filter((r) => r.id !== targetRecipe.id));
      setRejectModalOpen(false);

      const res = await rejectRecipeAction(targetRecipe.id, rejectReason);
      if (res.success) {
        toast.success(`"${targetRecipe.title}" rejected.`);
        loadQueue();
      } else {
        toast.error(res.error || "Failed to reject recipe.");
        loadQueue();
      }
    });
  };

  // Preset rejection templates
  const presets = [
    "Missing ingredient measurements or amounts.",
    "Instructions are unclear or too brief to follow.",
    "Low quality or non-food hero image.",
    "Duplicate recipe already exists.",
    "Content contains promotional links or spam.",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: Minimal & Clean Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sparkles className="size-5.5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-heading text-foreground flex items-center gap-2">
              AI Moderation Queue
              {stats?.pendingRecipes ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {stats.pendingRecipes} Pending
                </span>
              ) : null}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
              <span>Review recipe submissions with AI safety scores and 1-click decisions</span>
              {aiProvider && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted/80 text-foreground/80 border border-border">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {aiProvider.provider}: {aiProvider.model}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadQueue}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border hover:bg-muted/70 transition-all text-foreground"
            title="Refresh Queue"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/recipe/create"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-2xs transition-all"
          >
            <Plus className="size-3.5" />
            New Recipe
          </Link>
        </div>
      </div>

      {/* Queue Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start">
          <button
            type="button"
            onClick={() => setStatusTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === "pending"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="size-3.5 text-amber-500" />
            Pending ({stats?.pendingRecipes || 0})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("approved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === "approved"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Approved ({stats?.approvedRecipes || 0})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("rejected")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusTab === "rejected"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <XCircle className="size-3.5 text-rose-500" />
            Rejected ({stats?.rejectedRecipes || 0})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({stats?.totalRecipes || 0})
          </button>
        </div>

        {/* Live Search */}
        <div className="relative w-full md:w-72">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search queue by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-card p-12 rounded-2xl border border-border text-center text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            Loading moderation queue...
          </div>
        ) : recipes.length === 0 ? (
          <div className="bg-card p-12 rounded-2xl border border-border text-center space-y-2">
            <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {statusTab === "pending"
                ? "Queue is all clear!"
                : "No recipes found in this view"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {statusTab === "pending"
                ? "No recipes are waiting for moderation. New community submissions will appear here automatically."
                : "Try selecting a different tab or clearing your search term."}
            </p>
          </div>
        ) : (
          recipes.map((recipe) => {
            const score = typeof recipe.ai_score === "number" ? recipe.ai_score : 0.95;
            const scorePercent = Math.round(score * 100);
            const isSafe = score >= 0.7;
            const issues = recipe.ai_analysis?.issues || [];

            return (
              <div
                key={recipe.id}
                className="bg-card p-4 rounded-2xl border border-border hover:border-foreground/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Recipe & Author Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {recipe.hero_image ? (
                    <img
                      src={recipe.hero_image}
                      alt={recipe.title}
                      className="size-16 rounded-xl object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                      <Inbox className="size-6" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate">
                        <Link href={`/admin/inspect/${recipe.id}`}>
                          {recipe.title}
                        </Link>
                      </h4>

                      {/* Status Tag */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          recipe.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : recipe.status === "rejected"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {recipe.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>By {recipe.profiles?.full_name || recipe.profiles?.username || "Unknown"}</span>
                      {recipe.profiles?.is_banned && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/10 text-red-500 font-semibold">
                          Banned User
                        </span>
                      )}
                      <span>•</span>
                      <span>{recipe.category || "General"}</span>
                      <span>•</span>
                      <span>{new Date(recipe.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* AI Flags preview if any */}
                    {issues.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        {issues.slice(0, 2).map((issue: string, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                          >
                            <AlertTriangle className="size-2.8 shrink-0" />
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: AI Score Gauge & Action Controls */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                  {/* AI Safety Score Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      isSafe
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                    title={recipe.ai_analysis?.summary || "AI Analysis"}
                  >
                    {isSafe ? (
                      <ShieldCheck className="size-3.5" />
                    ) : (
                      <ShieldAlert className="size-3.5" />
                    )}
                    <span>{scorePercent}% {isSafe ? "Safe" : "Risk"}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {recipe.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickApprove(recipe.id, recipe.title)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                          title="1-Click Approve"
                        >
                          <Check className="size-3.5" />
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => openRejectDialog(recipe)}
                          disabled={isPending}
                          className="p-1.5 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          title="Reject"
                        >
                          <X className="size-4" />
                        </button>
                      </>
                    )}

                    <Link
                      href={`/admin/inspect/${recipe.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-foreground transition-all"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reject Reason Dialog Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold font-heading text-foreground">
              Reject Recipe Submission
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Provide feedback for <span className="font-semibold text-foreground">"{targetRecipe?.title}"</span> so the creator knows what to fix.
            </p>

            {/* Presets Chips */}
            <div className="mt-4 space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground block">
                Quick Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-muted hover:bg-muted/80 text-foreground border border-border/80 text-left transition-all"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Moderation Reason *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State why this recipe was rejected..."
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isPending || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
