"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export interface FooterProps {
  className?: string;
  maxWidth?: string;
}

export function Footer({
  className = "",
  maxWidth = "max-w-6xl",
}: FooterProps) {
  const { t, l } = useTranslation();

  return (
    <footer className={`w-full border-t border-border mt-auto ${className}`}>
      <div
        className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground`}
      >
        {/* Left Nav Links */}
        <nav aria-label="Footer Main Links" className="flex items-center gap-5 sm:gap-6">
          <Link
            href={l("/")}
            className="hover:text-foreground transition-colors font-medium"
          >
            {t("nav.home")}
          </Link>
          <Link
            href={l("/search")}
            className="hover:text-foreground transition-colors font-medium"
          >
            {t("nav.search")}
          </Link>
          <Link
            href={l("/saved")}
            className="hover:text-foreground transition-colors font-medium"
          >
            {t("nav.saved")}
          </Link>
        </nav>

        {/* Center Copyright */}
        <p className="text-center order-last md:order-0 font-normal">
          Copyright &copy; 2026 Hey Garlic
        </p>

        {/* Right Policy Links */}
        <nav
          aria-label="Footer Secondary Links"
          className="flex items-center gap-4 sm:gap-5 flex-wrap justify-center"
        >
          <Link
            href={l("/about")}
            className="hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link
            href={l("/contact")}
            className="hover:text-foreground transition-colors"
          >
            Contact
          </Link>
          <Link
            href={l("/privacy")}
            className="hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href={l("/terms")}
            className="hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href={l("/cookies")}
            className="hover:text-foreground transition-colors"
          >
            Cookies
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;

