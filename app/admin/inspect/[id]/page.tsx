"use client";

import React, { useEffect, useState, useTransition, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Utensils,
  Flame,
  Users,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Tag,
  Check,
  X,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecipeInspectionDataAction,
  approveRecipeAction,
  rejectRecipeAction,
  quickEditAndApproveRecipeAction,
  triggerAiReanalysisAction,
  toggleUserBanAction,
} from "@/app/actions/admin";

interface InspectPageProps {
  params: Promise<{ id: string }>;
}

export default function RecipeInspectPage({ params }: InspectPageProps) {
  const router = useRouter();
  const { id: recipeId } = use(params);

  const [recipe, setRecipe] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected AI tags to apply on approval
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Quick Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrep, setEditPrep] = useState(10);
  const [editCook, setEditCook] = useState(20);

  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
    setLoading(true);
    const res = await getRecipeInspectionDataAction(recipeId);
    if (res.success && res.recipe) {
      setRecipe(res.recipe);
      setUserStats(res.userStats);
      setEditTitle(res.recipe.title);
      setEditCategory(res.recipe.category || "General");
      setEditPrep(res.recipe.prep_time || 10);
      setEditCook(res.recipe.cook_time || 20);

      // Pre-select suggested AI tags
      const suggested = res.recipe.ai_analysis?.suggested_tags || [];
      setSelectedTags(suggested);
    } else {
      toast.error(res.error || "Failed to load recipe dossier.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [recipeId]);

  // Keyboard Shortcuts: A = Approve, R = Reject, E = Edit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is inside an input or textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleApprove();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setRejectModalOpen(true);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setEditModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recipe, selectedTags]);

  const handleApprove = () => {
    if (!recipe) return;

    startTransition(async () => {
      const res = await approveRecipeAction(recipe.id, {
        additionalTags: selectedTags,
      });

      if (res.success) {
        toast.success(`"${recipe.title}" approved and published!`);
        router.push("/admin");
      } else {
        toast.error(res.error || "Failed to approve recipe.");
      }
    });
  };

  const handleConfirmReject = () => {
    if (!recipe || !rejectReason.trim()) return;

    startTransition(async () => {
      setRejectModalOpen(false);
      const res = await rejectRecipeAction(recipe.id, rejectReason);

      if (res.success) {
        toast.success(`"${recipe.title}" rejected.`);
        router.push("/admin");
      } else {
        toast.error(res.error || "Failed to reject recipe.");
      }
    });
  };

  const handleConfirmQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipe) return;

    startTransition(async () => {
      const res = await quickEditAndApproveRecipeAction(recipe.id, {
        title: editTitle,
        category: editCategory,
        prep_time: Number(editPrep),
        cook_time: Number(editCook),
        tags: selectedTags,
      });

      if (res.success) {
        toast.success("Recipe edited & approved successfully!");
        setEditModalOpen(false);
        router.push("/admin");
      } else {
        toast.error(res.error || "Failed to save edits.");
      }
    });
  };

  const handleReanalyzeAi = () => {
    startTransition(async () => {
      const res = await triggerAiReanalysisAction(recipe.id);
      if (res.success) {
        toast.success("AI safety analysis updated!");
        loadData();
      } else {
        toast.error(res.error || "Failed to run AI re-analysis.");
      }
    });
  };

  const handleToggleUserBan = (isBanned: boolean) => {
    if (!recipe?.author?.id) return;
    const authorName = recipe.author.full_name || recipe.author.username || "User";

    if (!window.confirm(`Are you sure you want to ${isBanned ? "BAN" : "UNBAN"} ${authorName}?`)) {
      return;
    }

    startTransition(async () => {
      const res = await toggleUserBanAction(recipe.author.id, isBanned);
      if (res.success) {
        toast.success(`${authorName} has been ${isBanned ? "suspended" : "unbanned"}.`);
        loadData();
      } else {
        toast.error(res.error || "Failed to update ban status.");
      }
    });
  };

  const toggleTag = (t: string) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground text-xs gap-3">
        <RefreshCw className="size-6 animate-spin text-primary" />
        <span>Loading recipe dossier & AI report...</span>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border">
        <p className="text-sm font-semibold text-foreground">Recipe not found.</p>
        <Link href="/admin" className="text-xs text-primary underline mt-2 block">
          ← Back to Review Queue
        </Link>
      </div>
    );
  }

  const aiScore = typeof recipe.ai_score === "number" ? recipe.ai_score : 0.95;
  const scorePercent = Math.round(aiScore * 100);
  const isSafe = aiScore >= 0.7;
  const analysis = recipe.ai_analysis || {};
  const issues = analysis.issues || [];
  const suggestedTags = analysis.suggested_tags || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Quick Nav */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Queue
        </Link>

        {/* Keyboard hints */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Shortcuts:</span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">A</kbd> Approve
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">R</kbd> Reject
          <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">E</kbd> Quick Edit
        </div>
      </div>

      {/* Split View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: 60% RECIPE DOSSIER (Content to verify)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Card */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Hero Image */}
            {recipe.hero_image ? (
              <div className="relative aspect-video w-full overflow-hidden bg-muted border-b border-border">
                <img
                  src={recipe.hero_image}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                    {recipe.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-muted text-center border-b border-border text-xs text-muted-foreground">
                No hero photo provided for this recipe.
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Header & Author Track Record */}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                  {recipe.title}
                </h1>

                {/* Author Trust Bar */}
                <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/80 flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    {recipe.author?.avatar_url ? (
                      <img
                        src={recipe.author.avatar_url}
                        alt=""
                        className="size-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {recipe.author?.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-foreground block">
                        {recipe.author?.full_name || recipe.author?.username || "Unknown Author"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        @{recipe.author?.username || "user"}
                      </span>
                    </div>
                  </div>

                  {/* Author Stats */}
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Track Record: <strong className="text-foreground">{userStats?.approvedRecipes || 0}</strong> approved,{" "}
                      <strong className="text-rose-600">{userStats?.rejectedRecipes || 0}</strong> rejected
                    </span>

                    {recipe.author?.is_banned ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold">
                        BANNED
                      </span>
                    ) : userStats?.rejectedRecipes >= 3 ? (
                      <button
                        type="button"
                        onClick={() => handleToggleUserBan(true)}
                        className="px-2 py-0.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Ban Spammer
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Quick Specs Chips */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground font-semibold border border-border">
                  <Clock className="size-3.5 text-muted-foreground" />
                  Prep: {recipe.prep_time || 0}m
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground font-semibold border border-border">
                  <Flame className="size-3.5 text-orange-500" />
                  Cook: {recipe.cook_time || 0}m
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground font-semibold border border-border">
                  <Users className="size-3.5 text-muted-foreground" />
                  Servings: {recipe.default_servings || 2}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-foreground font-semibold border border-border">
                  Category: {recipe.category || "General"}
                </span>
              </div>

              {/* Description */}
              {recipe.description && (
                <div className="text-xs sm:text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/50">
                  {recipe.description}
                </div>
              )}

              {/* Ingredients List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Utensils className="size-4 text-primary" />
                  Ingredients ({(recipe.ingredients || []).length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(recipe.ingredients || []).map((ing: any, idx: number) => {
                    const name = typeof ing === "string" ? ing : ing?.name || "";
                    const amount = typeof ing === "object" ? ing?.baseAmount ?? ing?.amount : "";
                    const unit = typeof ing === "object" ? ing?.unit : "";

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-foreground truncate pr-2">
                          {name}
                        </span>
                        <span className="text-muted-foreground font-mono shrink-0">
                          {amount ? `${amount} ${unit || ""}`.trim() : (
                            <span className="text-amber-500 font-bold">No amount</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Preparation Steps ({(recipe.instructions || []).length})
                </h3>

                <div className="space-y-2.5">
                  {(recipe.instructions || []).map((step: any, idx: number) => {
                    const text = typeof step === "string" ? step : step?.description || step?.text || "";
                    const title = typeof step === "object" ? step?.title : "";

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs leading-relaxed"
                      >
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-0.5">
                          {title && <span className="font-bold text-foreground block">{title}</span>}
                          <p className="text-foreground/90">{text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 40% AI INTELLIGENCE & DECISION DOCK         */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          {/* AI Intelligence Card */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4.5 text-yellow-500" />
                <h3 className="text-sm font-bold text-foreground">
                  AI Safety Intelligence
                </h3>
              </div>
              <button
                type="button"
                onClick={handleReanalyzeAi}
                disabled={isPending}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Re-run live AI model"
              >
                <RefreshCw className={`size-3 ${isPending ? "animate-spin" : ""}`} />
                {isPending ? "Analyzing with AI..." : "Re-analyze"}
              </button>
            </div>

            {/* Live Model Badge */}
            {analysis.provider && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border text-[11px]">
                <span className="text-muted-foreground">Engine:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${analysis.provider === "OpenRouter"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                      : analysis.provider === "Google Gemini"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}
                >
                  <Sparkles className="size-3" />
                  {analysis.provider}: {analysis.model || "active"}
                </span>
              </div>
            )}

            {/* Score Radial / Bar Meter */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Safety Confidence
                </span>
                <span
                  className={`text-2xl font-extrabold ${isSafe ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                >
                  {scorePercent}% {isSafe ? "Safe" : "Flagged"}
                </span>
              </div>

              <div
                className={`p-3 rounded-2xl ${isSafe
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
              >
                {isSafe ? <ShieldCheck className="size-8" /> : <ShieldAlert className="size-8" />}
              </div>
            </div>

            {/* Summary */}
            <div className="text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-3">
              "{analysis.summary || "Recipe passed initial structure validation."}"
            </div>

            {/* Detected Issues */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Detected Issues ({issues.length})
              </span>

              {issues.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>No formatting, safety, or spam issues detected.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {issues.map((iss: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2"
                    >
                      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                      <span>{iss}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Multimodal Photo Inspection */}
            {recipe.hero_image && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <ImageIcon className="size-3.5 text-primary" />
                    Multimodal Photo Analysis
                  </span>
                  {analysis.image_analysis ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        analysis.image_analysis.is_food && analysis.image_analysis.is_safe
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {analysis.image_analysis.is_food && analysis.image_analysis.is_safe
                        ? "Food Verified"
                        : "Photo Alert"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Heuristic</span>
                  )}
                </div>
                {analysis.image_analysis?.label && (
                  <p className="text-[11px] text-muted-foreground">
                    Detected Content: <span className="font-semibold text-foreground">{analysis.image_analysis.label}</span>
                  </p>
                )}
                {analysis.image_analysis?.issue && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                    Issue: {analysis.image_analysis.issue}
                  </p>
                )}
              </div>
            )}

            {/* AI Suggested Tags */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Suggested Tags</span>
                <span className="text-[10px] text-muted-foreground font-normal">Click to toggle</span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {suggestedTags.map((tag: string, idx: number) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-muted text-muted-foreground hover:text-foreground border border-border"
                        }`}
                    >
                      <Tag className="size-3" />
                      #{tag}
                      {isSelected ? <Check className="size-3 ml-0.5" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Decision Dock (Sticky Actions) */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-2.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Moderator Decision
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Approve Button */}
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="col-span-2 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Check className="size-4.5" />
                Approve & Publish (A)
              </button>

              {/* Reject Button */}
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                disabled={isPending}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <X className="size-4" />
                Reject (R)
              </button>

              {/* Quick Edit Button */}
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                disabled={isPending}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-foreground flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="size-3.5" />
                Quick Edit (E)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold font-heading text-foreground">
              Reject Recipe
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select or provide a reason for rejecting this recipe.
            </p>

            {/* Presets */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                "Missing measurements for key ingredients.",
                "Cooking instructions are incomplete.",
                "Hero photo is irrelevant or low quality.",
                "Spam or inappropriate content.",
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReason(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-muted hover:bg-muted/80 text-foreground border border-border text-left"
                >
                  {p}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection explanation..."
              className="mt-3 w-full px-3.5 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
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

      {/* Quick Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold font-heading text-foreground">
              Quick Edit & Approve
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Correct minor title, timing, or category discrepancies and publish immediately.
            </p>

            <form onSubmit={handleConfirmQuickEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Recipe Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Prep Time (mins)
                  </label>
                  <input
                    type="number"
                    value={editPrep}
                    onChange={(e) => setEditPrep(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Cook Time (mins)
                  </label>
                  <input
                    type="number"
                    value={editCook}
                    onChange={(e) => setEditCook(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all"
                >
                  Save & Approve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

