"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Search,
  Bookmark,
  Bell,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  Settings,
  ArrowLeft,
  LogIn,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getUnreadNotificationCountAction } from "@/app/actions/notifications";
import { useTranslation } from "@/lib/i18n/context";
import { cleanPathname } from "@/lib/i18n/config";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  shiftAmount: number;
  isDesktop: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  setIsOpen: () => { },
  openSidebar: () => { },
  closeSidebar: () => { },
  toggleSidebar: () => { },
  sidebarWidth: 68,
  shiftAmount: 0,
  isDesktop: true,
});

export function useSidebar() {
  return useContext(SidebarContext);
}

function PathnameTracker({ onChange }: { onChange: (path: string) => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onChange(pathname);
  }, [pathname, onChange]);
  return null;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false); // Closed by default
  const [windowWidth, setWindowWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    setMounted(true);
    setPathname(window.location.pathname);
    const updateWidth = () => setWindowWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const isDesktop = mounted && windowWidth >= 768;

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen((prev) => !prev);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll only on mobile when the separate drawer is open
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isDesktop]);

  // Max width of centered site content (max-w-7xl = 1280px)
  const contentMaxWidth = 1280;
  const sidebarWidth = isOpen ? 260 : 68;

  // Natural margin available between viewport edge and centered content
  const naturalMargin =
    windowWidth > 0 ? Math.max(0, (windowWidth - contentMaxWidth) / 2) : 0;

  const cleanPath = cleanPathname(pathname);
  const isIsolatedPage =
    cleanPath === "/login" ||
    cleanPath === "/register" ||
    cleanPath.startsWith("/settings") ||
    cleanPath.startsWith("/recipe") ||
    cleanPath.startsWith("/recipes") ||
    cleanPath.startsWith("/admin");

  // On desktop:
  // When naturalMargin >= sidebarWidth, centered content already naturally sits
  // completely clear of the sidebar! No shift needed (shiftAmount = 0).
  //
  // When naturalMargin < sidebarWidth, the sidebar would overlap the content.
  // We need to shift the content so its left edge is at or beyond sidebarWidth.
  // Because children have mx-auto within SidebarLayoutWrapper:
  // - If (windowWidth - sidebarWidth) >= contentMaxWidth:
  //   Content centers in remaining space: left_edge = P/2 + naturalMargin.
  //   To achieve left_edge = sidebarWidth: P = 2 * (sidebarWidth - naturalMargin).
  // - If (windowWidth - sidebarWidth) < contentMaxWidth:
  //   Content cannot center in remaining space, so left_edge = P.
  //   To achieve left_edge = sidebarWidth: P = sidebarWidth.
  const shiftAmount =
    !isIsolatedPage && isDesktop && windowWidth > 0
      ? naturalMargin >= sidebarWidth
        ? 0
        : windowWidth - sidebarWidth >= contentMaxWidth
          ? 2 * (sidebarWidth - naturalMargin)
          : sidebarWidth
      : 0;

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        setIsOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        sidebarWidth,
        shiftAmount,
        isDesktop,
      }}
    >
      <React.Suspense fallback={null}>
        <PathnameTracker onChange={setPathname} />
      </React.Suspense>
      {children}
    </SidebarContext.Provider>
  );
}

export function SidebarLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { shiftAmount } = useSidebar();

  return (
    <div
      className="flex-1 flex flex-col min-h-screen w-full transition-[padding-left] duration-300 ease-in-out"
      style={{
        paddingLeft: `${shiftAmount}px`,
      }}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export function Sidebar() {
  const { isOpen, openSidebar, closeSidebar, toggleSidebar, sidebarWidth } =
    useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [isSiteIconHovered, setIsSiteIconHovered] = useState(false);
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { t, l } = useTranslation();
  const clean = cleanPathname(pathname);

  useEffect(() => {
    // Skip notification polling when logged out or inside the admin console
    if (!user || clean.startsWith("/admin")) {
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
    // Poll every 60s instead of 30s to reduce backend load
    const timer = setInterval(fetchUnread, 60000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [user, clean]);

  // Do not show site sidebar on login, register, settings, admin, or recipe detail pages
  if (
    clean === "/login" ||
    clean === "/register" ||
    clean.startsWith("/settings") ||
    clean.startsWith("/recipe") ||
    clean.startsWith("/recipes") ||
    clean.startsWith("/admin")
  ) {
    return null;
  }

  const navItems = [
    {
      id: "nav-home",
      label: t("nav.home"),
      href: l("/"),
      icon: Home,
      isActive: clean === "/",
    },
    {
      id: "nav-search",
      label: t("nav.search"),
      href: l("/search"),
      icon: Search,
      isActive: clean.startsWith("/search"),
    },
    {
      id: "nav-saved",
      label: t("nav.saved"),
      href: l("/saved"),
      icon: Bookmark,
      isActive: clean.startsWith("/saved") || clean.startsWith("/save"),
    },
    {
      id: "nav-inbox",
      label: t("nav.inbox"),
      href: user ? l("/notifications") : l("/login?redirect=/notifications"),
      icon: Bell,
      isActive: clean.startsWith("/notifications"),
    },
    {
      id: "nav-profile",
      label: t("nav.profile"),
      href: user ? l("/profile") : l("/login?redirect=/profile"),
      icon: User,
      isActive: clean.startsWith("/profile"),
    },
  ];

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (hidden on mobile, flex on md and up) */}
      {/* Opens directly on the background, icons stay anchored,   */}
      {/* open/close icon ONLY displays while hovering over site    */}
      {/* icon, site icon shown at all other times.                */}
      {/* ======================================================== */}
      <aside
        aria-label="Desktop Sidebar"
        className="hidden md:flex fixed inset-y-0 left-0 z-30 bg-background dark:bg-sidebar select-none flex-col justify-between py-4 overflow-hidden border-none dark:border-r dark:border-sidebar-border shadow-none transition-[width] duration-300 ease-in-out"
        style={{
          width: `${sidebarWidth}px`,
        }}
      >
        {/* Top Header & Navigation Links */}
        <div className="flex flex-col w-full">
          {/* Top Site Icon Row: Icons stay right in place without moving */}
          <div className="flex items-center h-12 w-full">
            {/* Fixed icon slot: Exactly 68px wide, centered */}
            <div className="w-17 min-w-17 flex items-center justify-center shrink-0">
              {!isOpen ? (
                /* WHEN CLOSED: Hovering over site icon displays open icon */
                <button
                  type="button"
                  onClick={openSidebar}
                  onMouseEnter={() => setIsSiteIconHovered(true)}
                  onMouseLeave={() => setIsSiteIconHovered(false)}
                  aria-label="Open sidebar"
                  title="Open sidebar"
                  className="relative size-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer hover:bg-foreground/5 shrink-0"
                >
                  {/* Site Icon: Garlic Chef Mascot (shown when not hovered) */}
                  <div
                    className={`size-8 rounded-md overflow-hidden flex items-center justify-center transition-opacity duration-150 ${isSiteIconHovered ? "opacity-0" : "opacity-100"
                      }`}
                  >
                    <img
                      src="/garlic-chef.jpg"
                      alt="Hey Garlic Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Open Icon (ONLY displayed while hovering over the site icon when closed) */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isSiteIconHovered
                      ? "opacity-100 text-foreground"
                      : "opacity-0 pointer-events-none"
                      }`}
                  >
                    <PanelLeftOpen className="size-5 text-foreground stroke-[1.8]" />
                  </div>
                </button>
              ) : (
                /* WHEN OPEN: Site icon stays in place as the site icon (no close icon over it) */
                <Link
                  href={l("/")}
                  title="Hey Garlic"
                  className="size-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer hover:bg-foreground/5 shrink-0"
                >
                  <div className="size-8 rounded-md overflow-hidden flex items-center justify-center">
                    <img
                      src="/garlic-chef.jpg"
                      alt="Hey Garlic Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </Link>
              )}
            </div>

            {/* Brand Title & Right-Side Close Button: Unfolds to the right when open */}
            <div
              className={`flex items-center justify-between overflow-hidden transition-all duration-200 ease-in-out ${isOpen
                ? "w-48 opacity-100 pl-1 pr-3"
                : "w-0 opacity-0 pointer-events-none"
                }`}
            >
              <Link
                href={l("/")}
                className="font-heading text-xl font-medium tracking-tight text-foreground whitespace-nowrap block"
              >
                Hey Garlic
              </Link>

              {/* Close Icon enabled on the right side */}
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close sidebar"
                title="Close sidebar"
                className="size-8 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="size-5 stroke-[1.8]" />
              </button>
            </div>
          </div>

          {/* Thin divider */}
          <div className="w-10 h-px bg-border/40 my-3 mx-auto shrink-0" />

          {/* Navigation Items (Home, Search, Saved, Profile) */}
          <nav aria-label="Sidebar Navigation" className="flex flex-col gap-2 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center transition-colors duration-150 ${isOpen
                    ? "h-10 w-[calc(100%-16px)] mx-2 rounded-lg"
                    : "size-10 mx-auto rounded-lg justify-center"
                    } ${item.isActive
                      ? "bg-foreground/10 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    }`}
                >
                  {/* Fixed icon slot: Exactly 40px wide, centered */}
                  <div
                    className={`flex items-center justify-center shrink-0 relative ${isOpen ? "w-11 min-w-11" : "size-10"
                      }`}
                  >
                    <Icon
                      className="size-5 stroke-[1.8]"
                    />
                    {item.id === "nav-inbox" && unreadCount > 0 && (
                      <span className="absolute top-2 right-2.5 size-2 rounded-full bg-red-500 ring-2 ring-background" />
                    )}
                  </div>

                  {/* Text Label: Unfolds smoothly to the right */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen
                      ? "w-40 opacity-100 pr-3"
                      : "w-0 opacity-0 pointer-events-none"
                      }`}
                  >
                    <span className="text-[14px] whitespace-nowrap block">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings at very bottom */}
        <div className="w-full flex flex-col items-center gap-1.5 px-0">
          <Link
            href={l("/settings")}
            onClick={closeSidebar}
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
            className={`flex items-center transition-colors duration-150 ${isOpen
              ? "h-10 w-[calc(100%-16px)] mx-2 rounded-lg"
              : "size-10 mx-auto rounded-lg justify-center"
              } ${clean.startsWith("/settings")
                ? "bg-foreground/10 text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
          >
            <div className={`flex items-center justify-center shrink-0 ${isOpen ? "w-11 min-w-11" : "size-10"}`}>
              <Settings className="size-5 stroke-[1.8]" />
            </div>

            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen
                ? "w-40 opacity-100 pr-3"
                : "w-0 opacity-0 pointer-events-none"
                }`}
            >
              <span className="text-[14px] whitespace-nowrap block">
                {t("nav.settings")}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE SIDEBAR DRAWER (hidden on md, visible on < md) */}
      {/* Opens as a separate slide-in item with backdrop overlay  */}
      {/* to prevent layout issues and ensure 100% smooth mobile UX */}
      {/* ======================================================== */}
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden ${isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
          }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Mobile Separate Slide-Out Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#F7F5EE] dark:bg-sidebar border-r border-border/80 dark:border-sidebar-border shadow-2xl flex flex-col justify-between py-5 px-4 font-sans transition-transform duration-300 ease-out md:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <Link
              href={l("/")}
              onClick={closeSidebar}
              className="flex items-center gap-2.5"
            >
              <div className="size-9 rounded-full overflow-hidden flex items-center justify-center">
                <img
                  src="/garlic-chef.jpg"
                  alt="Hey Garlic"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-heading text-2xl font-medium tracking-tight text-foreground">
                Hey Garlic
              </span>
            </Link>

            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Close menu"
              className="size-8 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Mobile Menu Links" className="flex flex-col gap-1.5 mt-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-[15px] font-medium transition-all ${item.isActive
                    ? "bg-[#EAE5D8] dark:bg-muted text-foreground shadow-2xs font-semibold"
                    : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      className={`size-5 shrink-0 ${item.isActive
                        ? "stroke-[2.2] text-foreground"
                        : "stroke-[1.8]"
                        }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.id === "nav-inbox" && unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Bottom: Settings / Log In */}
        <div className="pt-3 border-t border-border/70 flex flex-col gap-1.5">
          {user ? (
            <Link
              href={l("/settings")}
              onClick={closeSidebar}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-[15px] font-medium transition-all cursor-pointer text-left group ${clean.startsWith("/settings")
                ? "bg-[#EAE5D8] dark:bg-muted text-foreground shadow-2xs font-semibold"
                : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                }`}
            >
              <Settings className={`size-5 shrink-0 transition-transform duration-300 group-hover:rotate-45 ${clean.startsWith("/settings") ? "stroke-[2.2] text-foreground" : "stroke-[1.8]"}`} />
              <span>{t("nav.settings")}</span>
            </Link>
          ) : (
            <Link
              href={l("/login")}
              onClick={closeSidebar}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-medium text-foreground/80 hover:text-foreground hover:bg-foreground/5 transition-all cursor-pointer text-left group"
            >
              <LogIn className="size-5 shrink-0 stroke-[1.8]" />
              <span>{t("nav.signIn")}</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
