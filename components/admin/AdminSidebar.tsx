"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  UtensilsCrossed,
  Tags,
  MessageSquare,
  Users,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface AdminSidebarProps {
  userRole?: string;
  adminName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  userRole = "admin",
  adminName = "Administrator",
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Review Queue",
      href: "/admin",
      icon: Inbox,
      exact: true,
    },
    {
      label: "AI Security Reports",
      href: "/admin/reports",
      icon: Sparkles,
    },
    {
      label: "All Recipes",
      href: "/admin/recipes",
      icon: UtensilsCrossed,
    },
    {
      label: "Categories & Tags",
      href: "/admin/categories",
      icon: Tags,
    },
    {
      label: "Reviews Moderation",
      href: "/admin/reviews",
      icon: MessageSquare,
    },
    {
      label: "Users & Moderation",
      href: "/admin/users",
      icon: Users,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-18 border-b border-border">
        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
          <ShieldCheck className="size-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-heading text-lg font-bold tracking-tight text-foreground leading-tight truncate">
            Hey Garlic
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Admin Console
            <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/20">
              {userRole}
            </span>
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              }`}
            >
              <Icon className="size-4.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Switch to Public Site */}
      <div className="p-4 border-t border-border mt-auto space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border/60"
        >
          <span className="flex items-center gap-2">
            <ArrowLeft className="size-3.5" />
            Back to Public Site
          </span>
          <ExternalLink className="size-3.5 opacity-60" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed left) */}
      <aside className="hidden lg:flex w-64 fixed inset-y-0 left-0 z-40 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-xs flex-1 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

