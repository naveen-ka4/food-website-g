"use client";

import React from "react";
import Link, { LinkProps } from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export type LocalizedLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: React.ReactNode;
    skipLocalization?: boolean;
  };

/**
 * LocalizedLink preserves the active language prefix (e.g. /uk) across internal navigations.
 */
export const LocalizedLink = React.forwardRef<HTMLAnchorElement, LocalizedLinkProps>(
  ({ href, skipLocalization = false, ...props }, ref) => {
    const { l } = useTranslation();

    const localizedHref =
      !skipLocalization && typeof href === "string" ? l(href) : href;

    return <Link ref={ref} href={localizedHref} {...props} />;
  }
);

LocalizedLink.displayName = "LocalizedLink";

export default LocalizedLink;

