"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Trash2,
  Eye,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminReviewsAction,
  deleteReviewAdminAction,
} from "@/app/actions/admin";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [starFilter, setStarFilter] = useState<string>("all");

  const [isPending, startTransition] = useTransition();

  const fetchReviews = async (currentPage = page) => {
    setLoading(true);
    const minRating = starFilter !== "all" ? parseInt(starFilter, 10) : undefined;
    const maxRating = starFilter !== "all" ? parseInt(starFilter, 10) : undefined;

    const res = await getAdminReviewsAction({
      page: currentPage,
      limit: 20,
      search: searchTerm,
      minRating,
      maxRating,
    });

    if (res.success) {
      setReviews(res.reviews || []);
      setTotal(res.total || 0);
      setPage(res.page);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.error(res.error || "Failed to load reviews.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReviews(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, starFilter]);

  const handleDelete = (reviewId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) {
      return;
    }

    startTransition(async () => {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      const res = await deleteReviewAdminAction(reviewId);
      if (res.success) {
        toast.success("Review deleted successfully.");
        fetchReviews(page);
      } else {
        toast.error(res.error || "Failed to delete review.");
        fetchReviews(page);
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            Review Moderation
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor community ratings, detect abusive language or spam, and maintain discussion quality.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchReviews(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-muted/70 transition-all text-foreground"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-card p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reviews by comment text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground">Rating:</span>
          <select
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted/50 border border-border text-foreground focus:outline-none"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars only</option>
            <option value="1">1 Star (Critical complaints)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Recipe</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Comment</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Loading reviews...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-muted/30 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {rev.profiles?.avatar_url ? (
                          <img
                            src={rev.profiles.avatar_url}
                            alt=""
                            className="size-7 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {rev.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <span className="font-semibold text-foreground text-xs">
                          {rev.profiles?.full_name || rev.profiles?.username || "Anonymous"}
                        </span>
                      </div>
                    </td>

                    {/* Recipe */}
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      <Link
                        href={`/recipe/${rev.recipes?.slug}`}
                        target="_blank"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {rev.recipes?.title || "Recipe"}
                        <Eye className="size-3" />
                      </Link>
                    </td>

                    {/* Rating */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star className="size-3.5 fill-amber-500 text-amber-500" />
                        {rev.rating}/5
                      </span>
                    </td>

                    {/* Comment */}
                    <td className="py-3 px-4 text-xs text-foreground/90 max-w-md">
                      {rev.comment ? (
                        <p className="line-clamp-2">{rev.comment}</p>
                      ) : (
                        <span className="text-muted-foreground italic">No written comment</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(rev.id)}
                        disabled={isPending}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {reviews.length} of {total} reviews
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prev = page - 1;
                setPage(prev);
                fetchReviews(prev);
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
                fetchReviews(next);
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

