"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Star, ArrowLeft, ArrowRight, ThumbsUp, Loader2, MessageSquare, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import { createClient } from "@/lib/supabase/client";
import { submitRecipeReviewAction, getRecipeReviewsAction } from "@/app/actions/recipes";
import {
  submitReviewReplyAction,
  getReviewRepliesAction,
  deleteReviewReplyAction,
  ReviewReplyItem,
} from "@/app/actions/replies";

export interface ReviewItem {
  id: string;
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
  date: string;
  rating: number;
  comment: string;
  helpfulCount: number;
}

// Sample Community Reviews
const DEFAULT_COMMUNITY_REVIEWS: ReviewItem[] = [
  {
    id: "sample-1",
    name: "Sarah M.",
    isVerified: true,
    date: "Oct 24, 2026",
    rating: 5,
    comment:
      "Absolute perfection! I added a splash of white wine with the cream and it really elevated the flavor. So quick and the garlic ratio is spot on! My family loved it.",
    helpfulCount: 14,
  },
  {
    id: "sample-2",
    name: "Dilan P.",
    isVerified: false,
    date: "Oct 20, 2026",
    rating: 5,
    comment:
      "Really easy and delicious. I used unsalted butter and extra parsley as recommended. Def my new go-to weeknight pasta!",
    helpfulCount: 3,
  },
  {
    id: "sample-3",
    name: "Aria",
    isVerified: false,
    date: "Oct 18, 2026",
    rating: 5,
    comment:
      "Simple ingredients, huge flavor. Just like the tagline says! Followed exactly and it was super creamy. 10/10.",
    helpfulCount: 8,
  },
];

interface RecipeReviewsSectionProps {
  recipeId: string;
  recipeTitle?: string;
  initialRating?: number;
  initialReviewsCount?: number;
  isDedicatedPage?: boolean;
}

export default function RecipeReviewsSection({
  recipeId,
  recipeTitle = "Creamy Garlic Parmesan Pasta",
  initialRating = 4.9,
  initialReviewsCount = 124,
  isDedicatedPage = false,
}: RecipeReviewsSectionProps) {
  const { l } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState<number>(initialRating);
  const [totalCount, setTotalCount] = useState<number>(initialReviewsCount);

  // Form State
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reviews Feed & Likes
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
  const [helpfulLiked, setHelpfulLiked] = useState<Record<string, boolean>>({});

  // Threaded Replies State
  const [repliesMap, setRepliesMap] = useState<Record<string, ReviewReplyItem[]>>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  // Check auth user
  useEffect(() => {
    async function checkUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch {}
    }
    checkUser();
  }, []);

  // Fetch real reviews & replies from DB
  useEffect(() => {
    async function loadReviewsAndReplies() {
      try {
        const [dbReviews, replies] = await Promise.all([
          getRecipeReviewsAction(recipeId),
          getReviewRepliesAction(recipeId),
        ]);

        if (dbReviews && dbReviews.length > 0) {
          const mapped: ReviewItem[] = dbReviews.map((r: any) => ({
            id: r.id,
            name: r.profiles?.full_name || r.profiles?.username || "Verified Cook",
            avatarUrl: r.profiles?.avatar_url || undefined,
            isVerified: true,
            date: new Date(r.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            rating: r.rating,
            comment: r.comment || "",
            helpfulCount: 0,
          }));

          setReviewsList(mapped);
          setTotalCount(mapped.length);
        } else {
          setReviewsList([]);
          setTotalCount(0);
        }

        if (replies) {
          setRepliesMap(replies);
        }
      } catch (err) {
        console.warn("Could not load reviews/replies:", err);
      }
    }
    loadReviewsAndReplies();
  }, [recipeId, initialReviewsCount]);

  const handlePostReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    if (!user) {
      toast.error("Please log in to reply.");
      return;
    }

    setIsSubmittingReply(true);
    try {
      const res = await submitReviewReplyAction({
        reviewId,
        recipeId,
        comment: replyText.trim(),
      });

      if (!res.success || !res.reply) {
        toast.error(res.error || "Failed to post reply.");
        return;
      }

      toast.success("Reply posted!");
      setRepliesMap((prev) => ({
        ...prev,
        [reviewId]: [...(prev[reviewId] || []), res.reply!],
      }));
      setReplyText("");
      setReplyingToId(null);
    } catch {
      toast.error("Failed to post reply.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string, reviewId: string) => {
    try {
      const res = await deleteReviewReplyAction(replyId, recipeId);
      if (res.success) {
        toast.success("Reply removed");
        setRepliesMap((prev) => ({
          ...prev,
          [reviewId]: (prev[reviewId] || []).filter((r) => r.id !== replyId),
        }));
      } else {
        toast.error("Could not delete reply");
      }
    } catch {
      toast.error("Could not delete reply");
    }
  };

  // Handle Form Submit
  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ratingInput) {
      toast.error("Please select a star rating.");
      return;
    }

    if (!user) {
      toast.error("Please log in to submit a review.", {
        action: {
          label: "Log In",
          onClick: () => {
            window.location.href = `/login?redirect=/recipe/${recipeId}/reviews`;
          },
        },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitRecipeReviewAction({
        recipeId,
        rating: ratingInput,
        comment: commentInput,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit review.");
        return;
      }

      toast.success("Review posted successfully!");

      const newReview: ReviewItem = {
        id: `user-rev-${Date.now()}`,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
        avatarUrl: user.user_metadata?.avatar_url,
        isVerified: true,
        date: "Just now",
        rating: ratingInput,
        comment: commentInput.trim(),
        helpfulCount: 0,
      };

      setReviewsList((prev) => [newReview, ...prev]);
      if (res.averageRating) setRating(res.averageRating);
      if (res.totalReviews) setTotalCount(res.totalReviews);

      setCommentInput("");
      setRatingInput(5);
    } catch {
      toast.error("An error occurred while posting your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleHelpful = (id: string) => {
    setHelpfulLiked((prev) => {
      const isLiked = !prev[id];
      setReviewsList((list) =>
        list.map((item) =>
          item.id === id
            ? { ...item, helpfulCount: item.helpfulCount + (isLiked ? 1 : -1) }
            : item
        )
      );
      return { ...prev, [id]: isLiked };
    });
  };

  const breakdownBars = [
    { stars: "5", percent: 85 },
    { stars: "4", percent: 10 },
    { stars: "3", percent: 3 },
    { stars: "2", percent: 2 },
    { stars: "1", percent: 0 },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        {isDedicatedPage && (
          <Link
            href={l(`/recipe/${recipeId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 group"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to {recipeTitle}</span>
          </Link>
        )}

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Reviews & Ratings
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
              {totalCount}
            </span>
          </div>

          {!isDedicatedPage && (
            <Link
              href={l(`/recipe/${recipeId}/reviews`)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors group"
            >
              <span>View all</span>
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Unified Overview & Review Form */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 sm:p-6 mb-8 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left: Score & Progress Breakdown */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  {rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  out of 5
                </span>
              </div>

              <div className="flex items-center gap-0.5 mb-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="size-4 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Based on {totalCount} community reviews
              </p>
            </div>

            {/* Subtle Minimal Breakdown Bars */}
            <div className="space-y-1.5 mt-4 pt-4 border-t border-border/50">
              {breakdownBars.map((b) => (
                <div key={b.stars} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-6 text-left font-medium text-foreground/80 shrink-0">
                    {b.stars}★
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-300"
                      style={{ width: `${b.percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right shrink-0 tabular-nums text-[11px]">
                    {b.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Clean Review Input */}
          <div className="lg:col-span-7 flex flex-col justify-between lg:pl-6 lg:border-l lg:border-border/60">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Write a review
                </h3>

                {/* Rating Stars Picker */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const isFilled = s <= (hoverRating || ratingInput);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRatingInput(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${s} stars`}
                        className="size-6 rounded flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`size-4 transition-colors ${
                            isFilled
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/30 stroke-1"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review Form */}
              <form onSubmit={handlePostReview} className="space-y-2.5">
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Share your feedback, tips, or adjustments..."
                  rows={3}
                  className="w-full rounded-xl border border-border/80 bg-background/50 p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/50 transition-colors resize-none"
                />

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Post Review</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Feed */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Community Feedback
        </h3>

        {reviewsList.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border/70 rounded-xl bg-card/30">
            <p className="text-sm font-medium text-foreground">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to share your experience with this recipe!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {reviewsList.map((rev) => {
              const isLiked = Boolean(helpfulLiked[rev.id]);
              const replies = repliesMap[rev.id] || [];

              return (
                <div key={rev.id} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-muted border border-border/60 flex items-center justify-center text-xs font-semibold text-foreground shrink-0 overflow-hidden">
                        {rev.avatarUrl ? (
                          <img
                            src={rev.avatarUrl}
                            alt={rev.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>{rev.name[0]?.toUpperCase()}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-medium text-foreground">
                            {rev.name}
                          </span>
                          {rev.isVerified && (
                            <span className="text-[10px] text-muted-foreground font-medium px-1.5 py-0.5 rounded bg-muted/80 border border-border/60">
                              Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          {rev.date}
                        </span>
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`size-3 ${
                            s <= rev.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-muted-foreground/20"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Comment Text */}
                  {rev.comment && (
                    <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed pl-10.5">
                      {rev.comment}
                    </p>
                  )}

                  {/* Actions: Helpful & Reply buttons */}
                  <div className="pl-10.5 mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleHelpful(rev.id)}
                      className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
                        isLiked ? "text-primary font-medium" : ""
                      }`}
                    >
                      <ThumbsUp className={`size-3 ${isLiked ? "fill-primary" : ""}`} />
                      <span>Helpful ({rev.helpfulCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          toast.error("Please log in to reply.");
                          return;
                        }
                        setReplyingToId(replyingToId === rev.id ? null : rev.id);
                        setReplyText("");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <MessageSquare className="size-3" />
                      <span>Reply {replies.length > 0 ? `(${replies.length})` : ""}</span>
                    </button>
                  </div>

                  {/* Threaded Replies List */}
                  {replies.length > 0 && (
                    <div className="pl-10.5 mt-3 space-y-2 border-l-2 border-border/40 ml-4 pl-3">
                      {replies.map((reply) => {
                        const isReplyOwner = user && user.id === reply.userId;
                        return (
                          <div
                            key={reply.id}
                            className="rounded-lg bg-muted/40 border border-border/40 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-foreground overflow-hidden">
                                  {reply.user.avatarUrl ? (
                                    <img src={reply.user.avatarUrl} alt="" className="size-full object-cover" />
                                  ) : (
                                    <span>{(reply.user.fullName || reply.user.username || "U")[0]?.toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="font-medium text-foreground text-xs">
                                  {reply.user.fullName || reply.user.username || "Cook"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>

                              {isReplyOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReply(reply.id, rev.id)}
                                  className="text-muted-foreground/60 hover:text-red-400 p-1 transition-colors"
                                  title="Delete reply"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-foreground/90 pl-7 leading-relaxed">{reply.comment}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Reply Form */}
                  {replyingToId === rev.id && (
                    <div className="pl-10.5 mt-3">
                      <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border/70 bg-card/70">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${rev.name}...`}
                          rows={2}
                          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePostReply(rev.id)}
                            disabled={isSubmittingReply || !replyText.trim()}
                            className="px-2.5 py-1.5 rounded-md bg-foreground text-background text-[11px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1 cursor-pointer"
                          >
                            {isSubmittingReply ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Send className="size-3" />
                            )}
                            <span>Send</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToId(null);
                              setReplyText("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-foreground text-center cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
