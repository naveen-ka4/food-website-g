/**
 * Rate Limiting Utilities
 * Enforces rate limits for API routes and Server Actions
 */

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type RateLimitAction =
  | "api_general"
  | "recipe_create"
  | "recipe_update"
  | "search"
  | "upload"
  | "auth_login"
  | "auth_signup"
  | "password_reset"
  | "review_create"
  | "comment_create"
  | "follow_action";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export class RateLimitError extends Error {
  public resetAt: Date;
  public limit: number;

  constructor(message: string, resetAt: Date, limit: number) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
    this.limit = limit;
  }
}

/**
 * Check rate limit using Supabase database function
 */
export async function checkRateLimit(
  action: RateLimitAction = "api_general",
  userId?: string
): Promise<RateLimitResult> {
  try {
    const supabase = await createClient();

    // Get IP address for anonymous users
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Call database rate limit function
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId || null,
      p_ip_address: ipAddress,
      p_action: action,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // Fail open - allow request if rate limit check fails
      return {
        allowed: true,
        remaining: 0,
        resetAt: new Date(Date.now() + 60000),
        limit: 0,
      };
    }

    if (!data || data.length === 0) {
      return {
        allowed: true,
        remaining: 100,
        resetAt: new Date(Date.now() + 60000),
        limit: 100,
      };
    }

    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: new Date(result.reset_at),
      limit: result.limit_value,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open - allow request if rate limit check fails
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + 60000),
      limit: 0,
    };
  }
}

/**
 * Enforce rate limit - throws error if limit exceeded
 */
export async function enforceRateLimit(
  action: RateLimitAction = "api_general",
  userId?: string
): Promise<void> {
  const result = await checkRateLimit(action, userId);

  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded for ${action}. Try again in ${Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000
      )} seconds.`,
      result.resetAt,
      result.limit
    );
  }
}

/**
 * Middleware to enforce rate limit and set headers
 */
export async function withRateLimit<T>(
  action: RateLimitAction,
  userId: string | undefined,
  handler: () => Promise<T>
): Promise<T> {
  const result = await checkRateLimit(action, userId);

  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Please try again later.`,
      result.resetAt,
      result.limit
    );
  }

  // Execute the handler
  return handler();
}

/**
 * Get rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt.getTime() / 1000).toString(),
  };
}

/**
 * Format rate limit error response
 */
export function formatRateLimitError(error: RateLimitError) {
  const retryAfter = Math.ceil((error.resetAt.getTime() - Date.now()) / 1000);

  return {
    error: "Too Many Requests",
    message: error.message,
    retryAfter,
    resetAt: error.resetAt.toISOString(),
    limit: error.limit,
  };
}

/**
 * Server Action wrapper with rate limiting
 */
export function withRateLimitAction<T extends (...args: any[]) => Promise<any>>(
  action: RateLimitAction,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await enforceRateLimit(action, user?.id);
      return await handler(...args);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return {
          success: false,
          error: error.message,
          rateLimitExceeded: true,
          retryAfter: Math.ceil((error.resetAt.getTime() - Date.now()) / 1000),
        };
      }
      throw error;
    }
  }) as T;
}
