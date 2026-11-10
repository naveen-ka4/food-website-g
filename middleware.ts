import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPPORTED_PREFIXES, getLocaleFromPrefix } from "./lib/i18n/config";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  // 1. Normalize redundant /us prefix to canonical default root (e.g. /us/search -> /search) and set en-US cookie
  if (pathname === "/us" || pathname.startsWith("/us/")) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.pathname = pathname.replace(/^\/us(\/|$)/, "$1") || "/";
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set("heygarlic_locale", "en-US", {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    return res;
  }

  // 2. Detect supported locale subpath (e.g. /uk, /ja)
  let activePrefix = "";
  let cleanPath = pathname;
  for (const prefix of SUPPORTED_PREFIXES) {
    if (pathname === `/${prefix}` || pathname.startsWith(`/${prefix}/`)) {
      activePrefix = prefix;
      cleanPath = pathname.replace(new RegExp(`^\\/${prefix}(\\/|$)`), "$1") || "/";
      break;
    }
  }

  // 3. Handle explicit query parameter override (e.g. ?lang=ja, ?locale=en-GB)
  const langQuery = (
    request.nextUrl.searchParams.get("lang") ||
    request.nextUrl.searchParams.get("locale") ||
    ""
  ).toLowerCase();

  if (langQuery) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete("lang");
    redirectUrl.searchParams.delete("locale");

    if (langQuery === "ja" || langQuery === "ja-jp" || langQuery === "jp") {
      redirectUrl.pathname = `/ja${cleanPath === "/" ? "" : cleanPath}`;
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set("heygarlic_locale", "ja-JP", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return res;
    } else if (langQuery === "uk" || langQuery === "en-gb" || langQuery === "gb") {
      redirectUrl.pathname = `/uk${cleanPath === "/" ? "" : cleanPath}`;
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set("heygarlic_locale", "en-GB", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return res;
    } else if (langQuery === "us" || langQuery === "en-us" || langQuery === "en") {
      redirectUrl.pathname = cleanPath;
      const res = NextResponse.redirect(redirectUrl);
      res.cookies.set("heygarlic_locale", "en-US", {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return res;
    }
  }

  // 4. Persistence for unprefixed routes: redirect to saved locale (e.g. / -> /ja if user selected Japanese)
  if (!activePrefix && !pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    const savedLocale = request.cookies.get("heygarlic_locale")?.value;
    if (savedLocale === "ja-JP") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/ja${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(redirectUrl);
    } else if (savedLocale === "en-GB") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/uk${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  const activeLocale = activePrefix ? getLocaleFromPrefix(activePrefix) : "en-US";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  // 3. Route protection based on canonical path
  const isAuthRoute =
    cleanPath.startsWith("/login") || cleanPath.startsWith("/register");

  // Protected routes: Profile, Settings, Recipe Create & Edit
  const isProtectedRoute =
    cleanPath.startsWith("/profile") ||
    cleanPath.startsWith("/settings") ||
    cleanPath.startsWith("/recipe/create") ||
    (cleanPath.startsWith("/recipe/") && cleanPath.endsWith("/edit"));

  const isAdminRoute = cleanPath.startsWith("/admin");

  // Check if browser has Supabase auth session cookies
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  let supabase: any = null;

  // Only invoke Supabase auth if user has auth cookies or is accessing protected/admin routes
  if (supabaseUrl && supabaseKey && (hasAuthCookie || isProtectedRoute || isAdminRoute || isAuthRoute)) {
    supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value);
            });
          }
        },
      },
    });

    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch {
      // If Supabase is unreachable or token is invalid, continue gracefully
    }
  }

  // Admin Route Protection: Check authentication and staff role
  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = activePrefix ? `/${activePrefix}/login` : "/login";
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (supabase) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = activePrefix ? `/${activePrefix}` : "/";
          redirectUrl.searchParams.set("error", "unauthorized");
          return NextResponse.redirect(redirectUrl);
        }
      } catch {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = activePrefix ? `/${activePrefix}` : "/";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // If unauthenticated user tries to access protected page, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = activePrefix ? `/${activePrefix}/login` : "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If already authenticated and accessing login/register, redirect to profile
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = activePrefix ? `/${activePrefix}/profile` : "/profile";
    return NextResponse.redirect(url);
  }

  // 4. Handle Subpath URL Rewrite for non-default locales (e.g. /uk/*, /ja/*)
  if (activePrefix) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = cleanPath;

    const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: request.headers,
      },
    });

    // Copy cookies from Supabase session refresh
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      rewriteResponse.cookies.set(cookie.name, cookie.value);
    });

    // Set locale metadata headers & cookie
    rewriteResponse.cookies.set("heygarlic_locale", activeLocale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
    rewriteResponse.headers.set("x-heygarlic-locale", activeLocale);
    rewriteResponse.headers.set("x-heygarlic-locale-prefix", activePrefix);

    return rewriteResponse;
  }

  // Default US English locale
  supabaseResponse.headers.set("x-heygarlic-locale", "en-US");
  supabaseResponse.headers.set("x-heygarlic-locale-prefix", "");
  supabaseResponse.cookies.set("heygarlic_locale", "en-US", {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image/asset extensions
     * - uploads directory
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
