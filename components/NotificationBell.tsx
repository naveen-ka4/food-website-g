"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Star,
  MessageSquare,
  Bookmark,
  Heart,
  Sparkles,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n/context";
import {
  NotificationItem,
  getNotificationsAction,
  getUnreadNotificationCountAction,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/app/actions/notifications";

function formatTimeAgo(isoString: string): string {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const { l } = useTranslation();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount and on window focus
  const fetchCount = async () => {
    if (!user) return;
    try {
      const count = await getUnreadNotificationCountAction();
      setUnreadCount(count);
    } catch {}
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchCount();

    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    // Poll count every 45s
    const timer = setInterval(fetchCount, 45000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [user]);

  // Close dropdown on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Load notifications when dropdown opens or active tab changes
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const items = await getNotificationsAction({
          limit: 15,
          filter: activeTab,
        });
        if (isMounted) {
          setNotifications(items);
        }
      } catch (err) {
        console.warn("Could not load notifications:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, user]);

  if (!user) return null;

  const handleToggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadAction();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      markNotificationAsReadAction(notif.id).catch(() => {});
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(l(notif.link));
    }
  };

  const renderIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "review":
        return <Star className="size-3 text-amber-400 fill-amber-400" />;
      case "review_reply":
        return <MessageSquare className="size-3 text-blue-400" />;
      case "save":
        return <Bookmark className="size-3 text-emerald-400 fill-emerald-400/20" />;
      case "recipe_like":
        return <Heart className="size-3 text-rose-400 fill-rose-400" />;
      default:
        return <Sparkles className="size-3 text-foreground" />;
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-label="Notifications"
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-red-500" />
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/30 border-b border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "unread"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs px-4">
                <p className="font-medium text-foreground">
                  {activeTab === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="mt-1 text-[11px]">
                  {activeTab === "unread"
                    ? "You're all caught up with your recipes & reviews!"
                    : "When users review, reply to, or save your recipes, you'll see them here."}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={`p-3 transition-colors hover:bg-muted/50 cursor-pointer flex items-start gap-3 relative ${
                      !notif.isRead ? "bg-muted/20" : ""
                    }`}
                  >
                    {/* Actor avatar / badge */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="size-8 rounded-full bg-muted border border-border/60 flex items-center justify-center text-xs font-medium text-foreground overflow-hidden">
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
                      <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-background border border-border/70 flex items-center justify-center">
                        {renderIcon(notif.type)}
                      </div>
                    </div>

                    {/* Notification Text */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notif.isRead && (
                      <div className="size-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-center">
            <Link
              href={l("/notifications")}
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
            >
              <span>View all in Inbox</span>
              <ExternalLink className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

