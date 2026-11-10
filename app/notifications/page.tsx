"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Plus,
  Bell,
  CheckCheck,
  Trash2,
  Star,
  MessageSquare,
  Bookmark,
  Heart,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
  Inbox,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/components/Sidebar";
import { UserDropdown } from "@/components/UserDropdown";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import { useTranslation } from "@/lib/i18n/context";
import {
  NotificationItem,
  getNotificationsAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
  deleteNotificationAction,
  clearReadNotificationsAction,
} from "@/app/actions/notifications";

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
    </svg>
  );
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

type FilterCategory = "all" | "unread" | "reviews" | "saves";

function NotificationsPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { t, l } = useTranslation();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSignInModal, setShowSignInModal] = useState<boolean>(false);

  const fetchList = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const items = await getNotificationsAction({ limit: 50 });
      setNotifications(items);
    } catch (err) {
      console.warn("Could not load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      setShowSignInModal(true);
      setIsLoading(false);
    } else if (user) {
      fetchList();
    }
  }, [user, authLoading]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotificationsAction();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      toast.success("Cleared all read notifications");
    } catch {
      toast.error("Failed to clear read notifications");
    }
  };

  const handleToggleRead = async (notif: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (!notif.isRead) {
        await markNotificationAsReadAction(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotificationAction(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification removed");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      markNotificationAsReadAction(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.link) {
      router.push(l(notif.link));
    }
  };

  // Filter items
  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === "unread") return !notif.isRead;
    if (activeFilter === "reviews")
      return notif.type === "review" || notif.type === "review_reply";
    if (activeFilter === "saves")
      return notif.type === "save" || notif.type === "recipe_like";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "review":
        return <Star className="size-3.5 text-amber-400 fill-amber-400" />;
      case "review_reply":
        return <MessageSquare className="size-3.5 text-blue-400" />;
      case "save":
        return <Bookmark className="size-3.5 text-emerald-400 fill-emerald-400/20" />;
      case "recipe_like":
        return <Heart className="size-3.5 text-rose-400 fill-rose-400" />;
      default:
        return <Sparkles className="size-3.5 text-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-yellow-300 selection:text-black dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
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

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 pt-8 sm:pt-10 pb-16">
        {/* Page Title & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                {t("notifications.title")}
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                  {t("notifications.unreadBadge", { count: unreadCount })}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("notifications.subtitle")}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCheck className="size-3.5" />
                <span>{t("notifications.markAllRead")}</span>
              </button>
            )}

            {notifications.some((n) => n.isRead) && (
              <button
                type="button"
                onClick={handleClearRead}
                className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="size-3.5" />
                <span>{t("notifications.clearRead")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 pt-4 pb-6 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: t("notifications.all") },
              { id: "unread", label: t("notifications.unread") },
              { id: "reviews", label: t("notifications.reviewsAndReplies") },
              { id: "saves", label: t("notifications.savesAndLikes") },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background font-semibold shadow-2xs"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Inbox Notifications List */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3">
            <Loader2 className="size-6 animate-spin" />
            <span>{t("notifications.loadingNotifications")}</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 sm:p-12">
            <div className="size-12 rounded-full bg-muted border border-border/80 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Inbox className="size-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {activeFilter === "unread"
                ? t("notifications.noUnreadTitle")
                : t("notifications.noNotificationsInView")}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {activeFilter === "unread"
                ? t("notifications.noUnreadSubtitle")
                : t("notifications.noNotificationsSubtitle")}
            </p>
            <div className="mt-6">
              <Link
                href={l("/search")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <span>{t("notifications.exploreRecipesButton")}</span>
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card/60 overflow-hidden shadow-2xs">
            {filteredNotifications.map((notif) => {
              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/40 cursor-pointer group ${
                    !notif.isRead ? "bg-muted/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Actor Avatar with Type Badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="size-10 rounded-full bg-muted border border-border/60 flex items-center justify-center text-xs font-semibold text-foreground overflow-hidden">
                        {notif.actorAvatar ? (
                          <img
                            src={notif.actorAvatar}
                            alt={notif.actorName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span>{notif.actorName[0]?.toUpperCase() || "U"}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background border border-border/70 flex items-center justify-center shadow-xs">
                        {renderIcon(notif.type)}
                      </div>
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs sm:text-sm font-semibold text-foreground">
                          {notif.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleToggleRead(notif, e)}
                        title="Mark as read"
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Check className="size-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDelete(notif.id, e)}
                      title="Delete notification"
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground/60 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sign-in prompt for guest visitors */}
      <SignInPromptModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Sign in to view your inbox"
        description="Connect with other cooks, track who saves your recipes, and respond to reviews."
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-muted-foreground">
          Loading inbox...
        </div>
      }
    >
      <NotificationsPageContent />
    </Suspense>
  );
}
