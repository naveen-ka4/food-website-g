"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  UserX,
  ExternalLink,
  RefreshCw,
  Tag,
  Clock,
  Camera,
  Bot,
  Smartphone,
  Check,
  X,
  Search,
} from "lucide-react";
import {
  getAdminModerationReportsAction,
  confirmAiRecommendationAction,
  type ModerationReportItem,
  type ModerationReportsSummary,
} from "@/app/actions/admin";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [summary, setSummary] = useState<ModerationReportsSummary>({
    totalAnalyzed: 0,
    autoApproved: 0,
    authorNotified: 0,
    flaggedIntercepted: 0,
    telegramActions: 0,
  });
  const [activeFilter, setActiveFilter] = useState<"all" | "flagged" | "needs_info" | "telegram_actions">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async (filter = activeFilter) => {
    setLoading(true);
    const res = await getAdminModerationReportsAction({ filter, limit: 50 });
    if (res.success && res.reports) {
      setReports(res.reports);
      if (res.summary) setSummary(res.summary);
    } else {
      toast.error(res.error || "Failed to load reports.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(activeFilter);
  }, [activeFilter]);

  const handleConfirmAction = (reportId: string, action: "approve" | "reject" | "ban") => {
    startTransition(async () => {
      const res = await confirmAiRecommendationAction(reportId, action);
      if (res.success) {
        toast.success(`Action confirmed: ${action.toUpperCase()}`);
        loadData(activeFilter);
      } else {
        toast.error(res.error || "Failed to execute confirmation.");
      }
    });
  };

  const filteredReports = reports.filter((rep) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rep.executiveSummary.toLowerCase().includes(q) ||
      (rep.authorName && rep.authorName.toLowerCase().includes(q)) ||
      rep.entityType.toLowerCase().includes(q) ||
      rep.issues.some((i) => i.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2.5">
            <Sparkles className="size-6 text-primary" />
            AI Moderation & Audit Reports
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Automated content surveillance, executive plain-English summaries, and 1-click decision confirmation.
          </p>
        </div>

        <button
          onClick={() => loadData(activeFilter)}
          disabled={loading || isPending}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading || isPending ? "animate-spin" : ""}`} />
          Refresh Activity
        </button>
      </div>

      {/* Metric Cards (Executive Overview for Non-Coders) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Analyzed */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Analyzed
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-foreground">{summary.totalAnalyzed}</span>
            <span className="text-[10px] text-muted-foreground">items</span>
          </div>
        </div>

        {/* Auto-Approved */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="size-3.5" /> Auto-Approved
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.autoApproved}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {summary.totalAnalyzed > 0
                ? `${Math.round((summary.autoApproved / summary.totalAnalyzed) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>

        {/* Missing Details Notified */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="size-3.5" /> Author Tips Sent
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.authorNotified}
            </span>
            <span className="text-[10px] text-muted-foreground">needs info</span>
          </div>
        </div>

        {/* Flagged / Intercepted */}
        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="size-3.5" /> Flagged / Blocked
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {summary.flaggedIntercepted}
            </span>
            <span className="text-[10px] text-muted-foreground">spam / hazards</span>
          </div>
        </div>

        {/* Telegram Actions */}
        <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <Smartphone className="size-3.5" /> Telegram Actions
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
              {summary.telegramActions}
            </span>
            <span className="text-[10px] text-muted-foreground">1-click bot decisions</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Activity" },
            { id: "flagged", label: "🚨 Flagged / Blocked" },
            { id: "needs_info", label: "⚠️ Missing Info Tips" },
            { id: "telegram_actions", label: "📱 Telegram Decisions" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report summaries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Reports Feed */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-xs text-muted-foreground gap-3">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <span>Loading AI audit trail & executive dossiers...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-border space-y-2">
          <ShieldCheck className="size-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No reports matching this view</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Content submissions will automatically appear here with plain-English AI explanations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isFlagged = report.verdict === "flagged" || report.verdict === "rejected" || report.verdict === "banned";
            const isNeedsInfo = report.verdict === "needs_info";
            const isSafe = report.verdict === "safe";

            return (
              <div
                key={report.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isFlagged
                    ? "bg-rose-500/5 border-rose-500/20 dark:bg-rose-950/10"
                    : isNeedsInfo
                    ? "bg-amber-500/5 border-amber-500/20 dark:bg-amber-950/10"
                    : "bg-card border-border"
                }`}
              >
                {/* Header Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Verdict Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isFlagged
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                          : isNeedsInfo
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isFlagged ? (
                        <>
                          <ShieldAlert className="size-3" /> Flagged & Intercepted
                        </>
                      ) : isNeedsInfo ? (
                        <>
                          <AlertTriangle className="size-3" /> Author Notified (Needs Details)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3" /> Auto-Approved
                        </>
                      )}
                    </span>

                    {/* Channel Pill */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                      {report.reviewedByChannel === "telegram_button" ? (
                        <>
                          <Smartphone className="size-2.5 text-purple-500" /> Telegram Button
                        </>
                      ) : report.reviewedByChannel === "admin_ui" ? (
                        <>
                          <ShieldCheck className="size-2.5 text-blue-500" /> Admin Console
                        </>
                      ) : (
                        <>
                          <Bot className="size-2.5 text-yellow-500" /> AI Agent
                        </>
                      )}
                    </span>

                    {/* Entity Type */}
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                      {report.entityType}
                    </span>
                  </div>

                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(report.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Body Content */}
                <div className="pt-3.5 space-y-3">
                  {/* Executive Summary (Human Language for Non-Coders) */}
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      AI Executive Summary
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                      "{report.executiveSummary}"
                    </p>
                  </div>

                  {/* Author & Image Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Author:</span>
                      <strong className="text-foreground">{report.authorName}</strong>
                      {report.authorUsername && (
                        <span className="text-[11px] text-muted-foreground">@{report.authorUsername}</span>
                      )}
                    </div>

                    {report.imageAnalysis && report.imageAnalysis.label && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground text-[11px] border border-border">
                        <Camera className="size-3 text-primary" />
                        <span>Photo Check: <strong>{report.imageAnalysis.label}</strong></span>
                        {report.imageAnalysis.is_food ? (
                          <span className="text-emerald-500 font-bold ml-1">✓ Food</span>
                        ) : (
                          <span className="text-rose-500 font-bold ml-1">⚠️ Not Food</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Issues List */}
                  {report.issues.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Detected Findings:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.issues.map((iss, idx) => (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isFlagged
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            <AlertTriangle className="size-3" />
                            {iss}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Tags */}
                  {report.suggestedTags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs text-muted-foreground">
                      <span className="text-[10px] uppercase font-bold">Suggested Tags:</span>
                      {report.suggestedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1-Click Interactive Decisions / Confirmation Dock */}
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Action Status:</span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-semibold">
                      {report.actionTaken.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Dossier */}
                    {report.entityType === "recipe" && (
                      <Link
                        href={`/admin/inspect/${report.entityId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors"
                      >
                        <ExternalLink className="size-3" /> Inspect
                      </Link>
                    )}

                    {/* Confirm AI Action Buttons */}
                    {report.actionTaken !== "manual_reviewed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConfirmAction(report.id, "approve")}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Check className="size-3" /> Confirm Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => handleConfirmAction(report.id, "reject")}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/20 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <X className="size-3" /> Reject & Remove
                        </button>

                        {report.authorId && (
                          <button
                            type="button"
                            onClick={() => handleConfirmAction(report.id, "ban")}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-rose-600 cursor-pointer transition-colors disabled:opacity-50"
                            title="Ban author profile"
                          >
                            <UserX className="size-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

