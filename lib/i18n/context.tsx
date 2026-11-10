"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  SupportedLocaleCode,
  SupportedLocalePrefix,
  LocaleMeta,
  getLocaleFromPathname,
  getPrefixFromLocale,
  localizePath,
  cleanPathname,
} from "./config";
import { enUS, TranslationDictionary } from "./dictionaries/en-US";
import { enGB } from "./dictionaries/en-GB";
import { jaJP } from "./dictionaries/jp-JP";

const DICTIONARIES: Record<SupportedLocaleCode, TranslationDictionary> = {
  "en-US": enUS,
  "en-GB": enGB,
  "ja-JP": jaJP,
};

interface LanguageContextType {
  locale: SupportedLocaleCode;
  localePrefix: SupportedLocalePrefix;
  meta: LocaleMeta;
  dictionary: TranslationDictionary;
  t: (path: string, params?: Record<string, string | number>) => string;
  l: (href: string) => string;
  setLocale: (newLocale: SupportedLocaleCode) => void;
  supportedLocales: LocaleMeta[];
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function resolveTranslation(
  dict: TranslationDictionary,
  path: string,
  fallbackDict: TranslationDictionary = enUS
): string {
  const parts = path.split(".");
  let current: any = dict;
  let fallback: any = fallbackDict;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      current = undefined;
    }

    if (fallback && typeof fallback === "object" && part in fallback) {
      fallback = fallback[part];
    } else {
      fallback = undefined;
    }
  }

  if (typeof current === "string") return current;
  if (typeof fallback === "string") return fallback;
  return path;
}

function LanguageProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Synchronously compute current locale from URL path to prevent hydration mismatch
  const locale = useMemo<SupportedLocaleCode>(() => {
    return getLocaleFromPathname(pathname);
  }, [pathname]);

  const meta = useMemo<LocaleMeta>(() => {
    return (
      SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0]
    );
  }, [locale]);

  const localePrefix = useMemo<SupportedLocalePrefix>(() => {
    return (meta.prefix as SupportedLocalePrefix) || "";
  }, [meta]);

  const dictionary = useMemo<TranslationDictionary>(() => {
    return DICTIONARIES[locale] || enUS;
  }, [locale]);

  // Keep <html lang="..."> attribute in sync with current locale
  useEffect(() => {
    try {
      document.documentElement.lang = locale.startsWith("ja")
        ? "ja"
        : locale.startsWith("en-GB")
        ? "en-GB"
        : "en";
    } catch {}
  }, [locale]);

  // Translation function supporting nested keys (e.g. "home.heroTitleLine1") and parameter substitution ({count})
  const t = (path: string, params?: Record<string, string | number>): string => {
    let result = resolveTranslation(dictionary, path, enUS);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
      }
    }
    return result;
  };

  // Localizes any internal path based on the currently active locale
  const l = (href: string): string => {
    return localizePath(href, locale);
  };

  // Switches language, sets cookie, and updates URL
  const setLocale = (newLocale: SupportedLocaleCode) => {
    if (newLocale === locale) return;

    // Set cookie for SSR and middleware
    try {
      document.cookie = `heygarlic_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    // Navigate to new localized path
    const canonical = cleanPathname(pathname);
    const newPath = localizePath(canonical, newLocale);
    router.push(newPath);
  };

  const value = useMemo<LanguageContextType>(
    () => ({
      locale,
      localePrefix,
      meta,
      dictionary,
      t,
      l,
      setLocale,
      supportedLocales: SUPPORTED_LOCALES,
    }),
    [locale, localePrefix, meta, dictionary, pathname]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

function DefaultLanguageProviderFallback({ children }: { children: React.ReactNode }) {
  const defaultMeta = SUPPORTED_LOCALES[0];
  const value: LanguageContextType = {
    locale: DEFAULT_LOCALE,
    localePrefix: "",
    meta: defaultMeta,
    dictionary: enUS,
    t: (path: string, params?: Record<string, string | number>) => {
      let result = resolveTranslation(enUS, path, enUS);
      if (params) {
        for (const [key, val] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
        }
      }
      return result;
    },
    l: (href: string) => href,
    setLocale: () => {},
    supportedLocales: SUPPORTED_LOCALES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<DefaultLanguageProviderFallback>{children}</DefaultLanguageProviderFallback>}>
      <LanguageProviderInner>{children}</LanguageProviderInner>
    </React.Suspense>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback for components outside provider during tests
    return {
      locale: DEFAULT_LOCALE,
      localePrefix: "" as SupportedLocalePrefix,
      meta: SUPPORTED_LOCALES[0],
      dictionary: enUS,
      t: (path: string, params?: Record<string, string | number>) => {
        let res = resolveTranslation(enUS, path, enUS);
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            res = res.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
          }
        }
        return res;
      },
      l: (href: string) => href,
      setLocale: () => {},
      supportedLocales: SUPPORTED_LOCALES,
    };
  }
  return ctx;
}

export const useLanguage = useTranslation;
