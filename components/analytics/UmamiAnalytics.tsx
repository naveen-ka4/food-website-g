import React from "react";
import Script from "next/script";

/**
 * Umami Analytics Integration Component
 * Lightweight, privacy-friendly, cookieless analytics (~2KB script).
 * Runs only if NEXT_PUBLIC_UMAMI_WEBSITE_ID is configured in environment variables.
 */
export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
  const scriptUrl =
    process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL?.trim() ||
    "https://cloud.umami.is/script.js";
  const domains = process.env.NEXT_PUBLIC_UMAMI_DOMAINS?.trim();

  // If no website ID is configured (e.g. local dev or not set yet), do not inject script
  if (!websiteId) {
    return null;
  }

  return (
    <Script
      src={scriptUrl}
      data-website-id={websiteId}
      data-domains={domains || undefined}
      strategy="afterInteractive"
      data-auto-track="true"
    />
  );
}

