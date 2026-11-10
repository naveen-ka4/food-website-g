"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Utensils,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecipeBySecretTokenAction,
  resolveRecipeBySecretTokenAction,
  SecretRecipeDossier,
} from "@/app/actions/moderation";

interface SecretReviewClientProps {
  token: string;
}

export default function SecretReviewClient({ token }: SecretReviewClientProps) {
  const [recipe, setRecipe] = useState<SecretRecipeDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResolved, setIsResolved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getRecipeBySecretTokenAction(token);
    if (res.success && res.recipe) {
      setRecipe(res.recipe);
    } else {
      setIsResolved(Boolean(res.isResolved));
      toast.error(res.error || "Could not load review ticket.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleApprove = () => {
    if (!recipe) return;
    startTransition(async () => {
      const res = await resolveRecipeBySecretTokenAction(token, "approve");
      if (res.success) {
        toast.success(`"${recipe.title}" approved and published!`);
        setIsResolved(true);
        setRecipe(null);
      } else {
        toast.error(res.error || "Failed to approve recipe.");
      }
    });
  };

  const handleReject = () => {
    if (!recipe) return;
    startTransition(async () => {
      const res = await resolveRecipeBySecretTokenAction(
        token,
        "reject",
        rejectReason.trim() || "Policy violation / spam"
      );
      if (res.success) {
        toast.success(`"${recipe.title}" rejected and 5h cooldown applied.`);
        setRejectModalOpen(false);
        setIsResolved(true);
        setRecipe(null);
      } else {
        toast.error(res.error || "Failed to reject recipe.");
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-xs text-muted-foreground gap-3">
        <RefreshCw className="size-6 animate-spin text-primary" />
        <span>Verifying secret capability key...</span>
      </div>
    );
  }

  if (isResolved || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border text-center space-y-4 shadow-sm">
          <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-lg font-bold font-heading text-foreground">
            Ticket Resolved
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This recipe has already been reviewed or this one-time secret token has expired.
          </p>
        </div>
      </div>
    );
  }

  const analysis = recipe.ai_analysis || {};
  const issues = analysis.issues || [];
  const author = recipe.author;

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-bold text-amber-900 dark:text-amber-200 block uppercase tracking-wider text-[11px]">
            Security Review Dossier (Confidential)
          </span>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            This recipe was intercepted by Hey Garlic autonomous filters. The author cannot view or delete it until you make a decision.
          </p>
        </div>
      </div>

      {/* Main Recipe Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Hero Photo */}
        {recipe.hero_image ? (
          <div className="aspect-video w-full bg-muted border-b border-border overflow-hidden relative">
            <img
              src={recipe.hero_image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold uppercase bg-black/70 text-white backdrop-blur-xs">
              Status: {recipe.status}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-muted/30 text-center text-xs text-muted-foreground border-b border-border">
            No hero image attached.
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {recipe.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border">
                Category: <b>{recipe.category || "General"}</b>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                Prep: {recipe.prep_time || 10}m | Cook: {recipe.cook_time || 20}m
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-muted border border-border flex items-center gap-1">
                <Utensils className="size-3 text-muted-foreground" />
                Servings: {recipe.default_servings || 2}
              </span>
            </div>
          </div>

          {/* Author Trust Info */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="size-7 rounded-full object-cover" />
              ) : (
                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {author?.username?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              <div>
                <span className="font-bold text-foreground block">
                  {author?.full_name || author?.username || "Unknown Author"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ID: {author?.id || "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                Strikes: {author?.spam_strikes || 0} / 5
              </span>
            </div>
          </div>

          {/* Security Violations Box */}
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              Detected Security Issues ({issues.length})
            </span>
            {issues.length > 0 ? (
              <ul className="space-y-1 text-xs text-foreground/90 pl-5 list-disc">
                {issues.map((iss: string, idx: number) => (
                  <li key={idx} className="font-medium text-rose-700 dark:text-rose-300">
                    {iss}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Flagged by automated security policy.
              </p>
            )}

            {analysis.executive_summary && (
              <p className="text-xs text-muted-foreground border-t border-rose-500/20 pt-2 italic">
                "{analysis.executive_summary}"
              </p>
            )}
          </div>

          {/* Ingredients & Steps preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                Ingredients ({recipe.ingredients?.length || 0})
              </span>
              <ul className="space-y-1 text-muted-foreground">
                {(recipe.ingredients || []).map((ing: any, i: number) => (
                  <li key={i}>
                    • {typeof ing === "string" ? ing : `${ing.amount || ""} ${ing.name || ""}`}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-muted/30 border border-border">
              <span className="font-bold text-foreground uppercase tracking-wider text-[11px] block">
                Instructions ({recipe.instructions?.length || 0})
              </span>
              <div className="space-y-1.5 text-muted-foreground">
                {(recipe.instructions || []).map((st: any, i: number) => (
                  <p key={i}>
                    <b>{i + 1}.</b>{" "}
                    {typeof st === "string" ? st : st.description || st.text || ""}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="size-4" />
              {isPending ? "Executing..." : "Approve & Publish"}
            </button>

            <button
              type="button"
              onClick={() => setRejectModalOpen(true)}
              disabled={isPending}
              className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <XCircle className="size-4" />
              Reject (Apply 5h Cooldown)
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Reject Recipe</h3>
            <p className="text-xs text-muted-foreground">
              Rejecting this recipe will apply a <b>5-hour publishing cooldown</b> to the author and add 1 strike to their record.
            </p>

            <div className="space-y-1.5">
              {[
                "Contains spam links or external invites",
                "Adult, sexually explicit, or inappropriate content",
                "Gambling, crypto, or promotional scam",
                "Non-food or hazardous instructions",
              ].map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors border ${
                    rejectReason === reason
                      ? "bg-primary/10 border-primary text-foreground font-semibold"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isPending}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

