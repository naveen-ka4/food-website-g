"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, ChevronDown, Sparkles, Palette, Loader2, Bookmark, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { getUnreadNotificationCountAction } from "@/app/actions/notifications";
import { useTranslation } from "@/lib/i18n/context";

interface UserDropdownProps {
  userName?: string;
  userAvatarUrl?: string;
  userEmail?: string;
  className?: string;
}

export function UserDropdown({
  userName,
  userAvatarUrl,
  userEmail,
  className = "",
}: UserDropdownProps) {
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();
  const { theme } = useTheme();
  const { t, l } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const count = await getUnreadNotificationCountAction();
        setUnreadCount(count);
      } catch {}
    };

    fetchUnread();

    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);
    const timer = setInterval(fetchUnread, 30000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle Escape key to close dropdown or modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showSignOutConfirm) {
          setShowSignOutConfirm(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen || showSignOutConfirm) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showSignOutConfirm]);

  const handleSignOutClick = () => {
    setIsOpen(false);
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setShowSignOutConfirm(false);
      toast.success("Signed out successfully.");
      router.push(l("/login"));
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  // 1. While auth state is initializing: render an elegant skeleton pill (never flash "Chef" or "c"!)
  if (isLoading) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-10 sm:h-11 rounded-lg border border-border/80 bg-card pl-1.5 pr-2.5 sm:pr-3 py-1 flex items-center gap-2 select-none shadow-2xs">
          <span className="size-7 sm:size-8 rounded-md bg-muted/60 animate-pulse border border-border/60" />
          <span className="size-3.5 bg-muted/60 animate-pulse rounded-sm" />
        </div>
      </div>
    );
  }

  // 2. If user is not authenticated: show a clean Log In button
  if (!user) {
    return (
      <div className={`relative ${className}`}>
        <Link
          href={l("/login")}
          className="h-10 sm:h-11 rounded-lg border border-border/80 bg-card px-4 py-1 flex items-center gap-1.5 text-xs sm:text-sm font-medium hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all text-foreground select-none"
        >
          <span>{t("nav.signIn")}</span>
        </Link>
      </div>
    );
  }

  // 3. User is authenticated: use real unified user data (props can override if passed)
  const displayName =
    userName || profile?.name || user.email?.split("@")[0] || "User";
  const avatarUrl =
    userAvatarUrl !== undefined ? userAvatarUrl : profile?.avatarUrl || "";
  const email = userEmail || profile?.email || user.email || "";
  const status = profile?.status || "";
  const initial =
    profile?.initial ||
    displayName.charAt(0).toUpperCase() ||
    (email ? email.charAt(0).toUpperCase() : "U");
  const showProfileBadge =
    user?.user_metadata?.notifications?.profile_badge !== false;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Head Profile Dropdown Pill Trigger Button */}
      <button
        type="button"
        aria-label="User Account Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-10 sm:h-11 rounded-lg border border-border/80 bg-card pl-1.5 pr-2.5 sm:pr-3 py-1 flex items-center gap-2 hover:bg-muted shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer select-none"
      >
        <div className="relative flex items-center justify-center">
          <span className="size-7 sm:size-8 rounded-md overflow-hidden border border-border/60 flex items-center justify-center bg-muted/60 text-xs font-bold text-foreground">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </span>
          {showProfileBadge && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-2.5 z-10 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2.5 bg-red-500 border border-card" />
            </span>
          )}
        </div>
        <ChevronDown
          className={`size-3.5 sm:size-4 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border/80 bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 origin-top-right font-sans">
          {/* User Info Header */}
          <div className="px-3 py-2.5 flex items-center gap-3 border-b border-border/60 mb-1">
            <div className="size-9 rounded-md overflow-hidden bg-muted/60 border border-border/80 flex items-center justify-center shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {initial}
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </span>
              {status ? (
                <span className="text-xs text-muted-foreground truncate">
                  {status}
                </span>
              ) : null}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-0.5">
            {/* View Profile */}
            <Link
              href={l("/profile")}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <User className="size-4 text-muted-foreground" />
              <span>{t("nav.profile")}</span>
            </Link>

            {/* Saved Recipes */}
            <Link
              href={l("/saved")}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <Bookmark className="size-4 text-muted-foreground" />
              <span>{t("nav.saved")}</span>
            </Link>

            {/* Notifications / Inbox */}
            <Link
              href={l("/notifications")}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="size-4 text-muted-foreground" />
                <span>{t("nav.inbox")}</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white min-w-4.5 text-center leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Settings (Requested with Settings icon!) */}
            <Link
              href={l("/settings")}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <Settings className="size-4 text-muted-foreground" />
              <span>{t("nav.settings")}</span>
            </Link>

            {/* Appearance (Theme settings) */}
            <Link
              href={l("/settings?tab=appearance")}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span>{t("nav.appearance")}</span>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/60">
                {theme}
              </span>
            </Link>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/60 my-1.5" />

          {/* Sign Out Item */}
          <button
            type="button"
            onClick={handleSignOutClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="size-4 text-destructive" />
            <span>{t("nav.signOut")}</span>
          </button>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !isSigningOut && setShowSignOutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xl animate-in zoom-in-95 duration-200 font-sans"
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5">
                <LogOut className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {t("common.signOutConfirmTitle")}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-normal">
                  {t("common.signOutConfirmDesc")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-border/50">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs sm:text-sm font-medium text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={isSigningOut}
                onClick={confirmSignOut}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 active:scale-95 text-destructive-foreground text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isSigningOut ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t("common.signingOut")}</span>
                  </>
                ) : (
                  <span>{t("nav.signOut")}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
