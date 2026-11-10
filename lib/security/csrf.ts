/**
 * CSRF Protection Implementation
 * Generates and validates CSRF tokens for state-changing operations
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import crypto from "crypto";

const CSRF_TOKEN_NAME = "heygarlic_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CSRFTokenData {
  token: string;
  expiresAt: number;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/**
 * Set CSRF token in cookies (server-side)
 * Should be called during session initialization
 */
export async function setCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const token = generateCSRFToken();
  const expiresAt = Date.now() + TOKEN_EXPIRY_MS;

  const tokenData: CSRFTokenData = {
    token,
    expiresAt,
  };

  cookieStore.set(CSRF_TOKEN_NAME, JSON.stringify(tokenData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_EXPIRY_MS / 1000,
  });

  return token;
}

/**
 * Get CSRF token from cookies (server-side)
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get(CSRF_TOKEN_NAME);

  if (!tokenCookie?.value) {
    return null;
  }

  try {
    const tokenData: CSRFTokenData = JSON.parse(tokenCookie.value);

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      // Token expired, remove it
      cookieStore.delete(CSRF_TOKEN_NAME);
      return null;
    }

    return tokenData.token;
  } catch {
    return null;
  }
}

/**
 * Validate CSRF token from request
 * Compares token in cookie with token in header/body
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    return false;
  }

  // Get token from header or body
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Compare tokens using constant-time comparison to prevent timing attacks
  if (!headerToken) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(cookieToken, "utf8"),
    Buffer.from(headerToken, "utf8")
  );
}

/**
 * Validate CSRF token from Server Action
 * Expects token in headers
 */
export async function validateServerActionCSRF(token: string): Promise<boolean> {
  const cookieToken = await getCSRFToken();
  if (!cookieToken) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken, "utf8"),
      Buffer.from(token, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Middleware helper to enforce CSRF on mutation requests
 */
export async function enforceCSRF(request: NextRequest): Promise<boolean> {
  const method = request.method;

  // Only enforce CSRF on state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return true;
  }

  // Skip CSRF for auth routes (they have their own protection)
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")) {
    return true;
  }

  return validateCSRFToken(request);
}

/**
 * Client-side helper to get CSRF token from meta tag
 * This should be called before making state-changing requests
 */
export function getCSRFTokenFromDOM(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute("content") || null;
}

/**
 * Attach CSRF token to fetch requests (client-side utility)
 */
export function attachCSRFToken(headers: HeadersInit = {}): HeadersInit {
  const token = getCSRFTokenFromDOM();
  if (!token) {
    return headers;
  }

  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
  };
}
