/**
 * Error Handling and Safe Error Messages
 * Provides typed error classes and safe error formatting
 */

import { ZodError } from "zod";

// ==============================================================================
// TYPED ERROR CLASSES
// ==============================================================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string>;

  constructor(message: string, errors: Record<string, string> = {}) {
    super(message, 400);
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = "Too many requests", retryAfter: number = 60) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed") {
    super(message, 500, false);
  }
}

// ==============================================================================
// ERROR RESPONSE FORMATTERS
// ==============================================================================

/**
 * Format error for client response (safe, no sensitive details)
 */
export function formatErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      ...(error instanceof ValidationError && { errors: error.errors }),
      ...(error instanceof RateLimitError && { retryAfter: error.retryAfter }),
    };
  }

  if (error instanceof ZodError) {
    const errors: Record<string, string> = {};
    const issues = (error as any).issues || (error as any).errors || [];
    issues.forEach((err: any) => {
      const path = Array.isArray(err.path) ? err.path.join(".") : "field";
      errors[path] = err.message;
    });

    return {
      success: false,
      error: "Validation failed",
      statusCode: 400,
      errors,
    };
  }

  // Generic error - don't expose details
  console.error("Unexpected error:", error);
  return {
    success: false,
    error: "An unexpected error occurred. Please try again later.",
    statusCode: 500,
  };
}

/**
 * Format error for logging (includes sensitive details)
 */
export function formatErrorForLogging(error: unknown) {
  if (error instanceof AppError) {
    return {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      timestamp: error.timestamp.toISOString(),
      stack: error.stack,
      ...(error instanceof ValidationError && { validationErrors: error.errors }),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}

// ==============================================================================
// ERROR LOGGING
// ==============================================================================

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
  SECURITY = "security",
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: any;
  userId?: string;
  requestId?: string;
}

/**
 * Structured logging utility
 */
export function log(level: LogLevel, message: string, context?: Record<string, any>) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  };

  // In production, send to external logging service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to external logging service
    console.log(JSON.stringify(entry));
  } else {
    // Development: pretty print
    const color = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m", // green
      warn: "\x1b[33m", // yellow
      error: "\x1b[31m", // red
      critical: "\x1b[35m", // magenta
      security: "\x1b[41m", // red background
    }[level];

    console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${message}`, context || "");
  }
}

/**
 * Security event logger
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  userId?: string
) {
  log(LogLevel.SECURITY, event, {
    ...details,
    userId,
    severity: "high",
  });

  // In production, trigger alerts for security events
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to security monitoring service
  }
}

// ==============================================================================
// ERROR HELPERS
// ==============================================================================

/**
 * Check if error is operational (safe to retry)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Safe error message for users (no sensitive data)
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof ZodError) {
    return "Invalid input data. Please check your entries.";
  }

  if (error instanceof Error) {
    // Only expose known safe error messages
    const safeMessages = [
      "Network request failed",
      "Failed to fetch",
      "Timeout",
      "Aborted",
    ];

    if (safeMessages.some((msg) => error.message.includes(msg))) {
      return "Network error. Please check your connection and try again.";
    }
  }

  return "An unexpected error occurred. Please try again later.";
}

/**
 * Async error wrapper for Server Actions
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Log error with context
      log(LogLevel.ERROR, `Error in ${context || "server action"}`, {
        error: formatErrorForLogging(error),
        args: args.length > 0 ? "[redacted]" : undefined,
      });

      // Return formatted error response
      return formatErrorResponse(error);
    }
  }) as T;
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: boolean,
  ErrorClass: typeof AppError = AppError,
  message?: string
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message || "Assertion failed");
  }
}

/**
 * Assert authenticated user or throw
 */
export function assertAuthenticated(
  userId: string | null | undefined,
  message?: string
): asserts userId is string {
  if (!userId) {
    throw new AuthenticationError(message);
  }
}

/**
 * Assert authorization or throw
 */
export function assertAuthorized(
  condition: boolean,
  message?: string
): asserts condition {
  if (!condition) {
    throw new AuthorizationError(message);
  }
}
