export const DEFAULT_LOCALE = "en-US" as const;

export interface LocaleMeta {
  code: string;
  prefix: string; // "" for default US, "uk" for UK, "si" for future Sinhala
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  defaultUnit: "metric" | "imperial";
}

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  {
    code: "en-US",
    prefix: "",
    name: "English (US)",
    nativeName: "English (US)",
    flag: "🇺🇸",
    region: "United States",
    defaultUnit: "imperial",
  },
  {
    code: "en-GB",
    prefix: "uk",
    name: "English (UK)",
    nativeName: "English (UK)",
    flag: "🇬🇧",
    region: "United Kingdom",
    defaultUnit: "metric",
  },
  {
    code: "ja-JP",
    prefix: "ja",
    name: "Japanese (日本語)",
    nativeName: "Japanese (日本語)",
    flag: "🇯🇵",
    region: "Japan",
    defaultUnit: "metric",
  },
  // Future extensions (ready to uncomment and add dictionaries):
  // {
  //   code: "si-LK",
  //   prefix: "si",
  //   name: "Sinhala",
  //   nativeName: "සිංහල",
  //   flag: "🇱🇰",
  //   region: "Sri Lanka",
  //   defaultUnit: "metric",
  // },
];

export type SupportedLocaleCode = "en-US" | "en-GB" | "ja-JP";
export type SupportedLocalePrefix = "" | "uk" | "ja";

export const SUPPORTED_PREFIXES = SUPPORTED_LOCALES.map((l) => l.prefix).filter(
  (p): p is string => Boolean(p)
);

/**
 * Extracts locale code from URL pathname (e.g. /uk/search -> en-GB, /ja/search -> ja-JP, /search -> en-US)
 */
export function getLocaleFromPathname(pathname: string): SupportedLocaleCode {
  if (!pathname) return DEFAULT_LOCALE;
  for (const loc of SUPPORTED_LOCALES) {
    if (!loc.prefix) continue;
    if (pathname === `/${loc.prefix}` || pathname.startsWith(`/${loc.prefix}/`)) {
      return loc.code as SupportedLocaleCode;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Returns locale code from prefix (e.g. "uk" -> "en-GB", "ja" -> "ja-JP")
 */
export function getLocaleFromPrefix(prefix: string): SupportedLocaleCode {
  const found = SUPPORTED_LOCALES.find((l) => l.prefix === prefix);
  return (found?.code as SupportedLocaleCode) || DEFAULT_LOCALE;
}

/**
 * Returns URL prefix for a given locale (e.g. en-GB -> "/uk", ja-JP -> "/ja", en-US -> "")
 */
export function getPrefixFromLocale(locale: SupportedLocaleCode): string {
  const found = SUPPORTED_LOCALES.find((l) => l.code === locale);
  return found?.prefix ? `/${found.prefix}` : "";
}

/**
 * Strips any locale prefix from pathname to get canonical path (e.g. /uk/search -> /search, /uk -> /)
 */
export function cleanPathname(pathname: string): string {
  if (!pathname) return "/";
  for (const prefix of SUPPORTED_PREFIXES) {
    if (pathname === `/${prefix}`) return "/";
    if (pathname.startsWith(`/${prefix}/`)) {
      return pathname.slice(prefix.length + 1) || "/";
    }
  }
  return pathname;
}

/**
 * Localizes a path string based on target locale
 */
export function localizePath(href: string, targetLocale: SupportedLocaleCode): string {
  if (
    !href ||
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api") ||
    href.startsWith("/_next") ||
    href.startsWith("/uploads")
  ) {
    return href;
  }

  // Parse path and hash/query if any
  const [pathAndQuery, hash] = href.split("#");
  const [path, query] = pathAndQuery.split("?");

  const canonical = cleanPathname(path);
  const prefix = getPrefixFromLocale(targetLocale);

  let newPath = canonical;
  if (prefix) {
    newPath = canonical === "/" ? prefix : `${prefix}${canonical}`;
  }

  if (query) newPath += `?${query}`;
  if (hash !== undefined) newPath += `#${hash}`;

  return newPath;
}

