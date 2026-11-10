import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/settings", "/profile", "/recipe/create", "/api/"],
    },
    sitemap: "https://heygarlic.com/sitemap.xml",
  };
}
