/**
 * Error Tracking & Monitoring
 * Centralized error handling with Sentry integration
 */

import { logger } from "./logger";

// ==============================================================================
// ERROR SEVERITY
// ==============================================================================

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// ==============================================================================
// ERROR CONTEXT
// ==============================================================================

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  path?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// ==============================================================================
// ERROR TRACKER CLASS
// ==============================================================================

class ErrorTracker {
  private enabled: boolean = false;
  private environment: string = "development";

  constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.enabled = process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING === "true";

    if (this.enabled) {
      this.initializeSentry();
    }
  }

  /**
   * Initialize Sentry (or other error tracking service)
   */
  private initializeSentry(): void {
    // Check if running in browser
    if (typeof window !== "undefined") {
      // Client-side Sentry initialization
      // Uncomment when Sentry is installed:
      /*
      import * as Sentry from "@sentry/nextjs";
      
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: this.environment,
        tracesSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
      */
    } else {
      // Server-side Sentry initialization
      // Uncomment when Sentry is installed:
      /*
      import * as Sentry from "@sentry/nextjs";
      
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: this.environment,
        tracesSampleRate: 1.0,
      });
      */
    }
  }

  /**
   * Capture an error
   */
  captureError(
    error: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ): string | null {
    // Log the error
    logger.error(
      `${severity.toUpperCase()}: ${error.message}`,
      error,
      context,
      {
        severity,
        errorType: error.name,
      }
    );

    if (!this.enabled) {
      return null;
    }

    // Send to Sentry (or other service)
    // Uncomment when Sentry is installed:
    /*
    import * as Sentry from "@sentry/nextjs";
    
    Sentry.withScope((scope) => {
      scope.setLevel(this.mapSeverityToSentryLevel(severity));
      
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context?.component) {
        scope.setTag("component", context.component);
      }
      
      if (context?.action) {
        scope.setTag("action", context.action);
      }
      
      if (context?.metadata) {
        scope.setContext("metadata", context.metadata);
      }
      
      return Sentry.captureException(error);
    });
    */

    return null; // Would return Sentry event ID
  }

  /**
   * Capture a message (non-error)
   */
  captureMessage(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext
  ): string | null {
    // Log the message
    const logMethod = severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
      ? logger.error
      : logger.warn;

    logMethod.call(logger, message, undefined, context, { severity });

    if (!this.enabled) {
      return null;
    }

    // Send to Sentry
    // Uncomment when Sentry is installed:
    /*
    import * as Sentry from "@sentry/nextjs";
    
    Sentry.withScope((scope) => {
      scope.setLevel(this.mapSeverityToSentryLevel(severity));
      
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context?.metadata) {
        scope.setContext("metadata", context.metadata);
      }
      
      return Sentry.captureMessage(message);
    });
    */

    return null;
  }

  /**
   * Map severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: ErrorSeverity): any {
    const mapping = {
      [ErrorSeverity.LOW]: "info",
      [ErrorSeverity.MEDIUM]: "warning",
      [ErrorSeverity.HIGH]: "error",
      [ErrorSeverity.CRITICAL]: "fatal",
    };
    return mapping[severity] || "error";
  }

  /**
   * Set user context
   */
  setUser(userId: string, email?: string, username?: string): void {
    if (!this.enabled) return;

    // Uncomment when Sentry is installed:
    /*
    import * as Sentry from "@sentry/nextjs";
    
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
    */
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.enabled) return;

    // Uncomment when Sentry is installed:
    /*
    import * as Sentry from "@sentry/nextjs";
    Sentry.setUser(null);
    */
  }

  /**
   * Add breadcrumb (navigation trail)
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: "debug" | "info" | "warning" | "error" = "info",
    data?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    // Uncomment when Sentry is installed:
    /*
    import * as Sentry from "@sentry/nextjs";
    
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
    */
  }

  /**
   * Wrap async function with error tracking
   */
  wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.captureError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.HIGH,
          context
        );
        throw error;
      }
    }) as T;
  }

  /**
   * Wrap sync function with error tracking
   */
  wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        this.captureError(
          error instanceof Error ? error : new Error(String(error)),
          ErrorSeverity.HIGH,
          context
        );
        throw error;
      }
    }) as T;
  }
}

// ==============================================================================
// SINGLETON INSTANCE
// ==============================================================================

let trackerInstance: ErrorTracker | null = null;

export function getErrorTracker(): ErrorTracker {
  if (!trackerInstance) {
    trackerInstance = new ErrorTracker();
  }
  return trackerInstance;
}

// ==============================================================================
// CONVENIENCE EXPORTS
// ==============================================================================

export const errorTracker = getErrorTracker();

// ==============================================================================
// REACT ERROR BOUNDARY HELPER
// ==============================================================================

export function captureComponentError(
  error: Error,
  errorInfo: { componentStack: string },
  componentName?: string
): void {
  errorTracker.captureError(error, ErrorSeverity.HIGH, {
    component: componentName,
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  });
}

// ==============================================================================
// GLOBAL ERROR HANDLERS
// ==============================================================================

/**
 * Initialize global error handlers
 */
export function initializeGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // Unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    errorTracker.captureError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      ErrorSeverity.HIGH,
      {
        metadata: {
          reason: event.reason,
          promise: String(event.promise),
        },
      }
    );
  });

  // Global errors
  window.addEventListener("error", (event) => {
    errorTracker.captureError(
      event.error || new Error(event.message),
      ErrorSeverity.HIGH,
      {
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      }
    );
  });
}

// ==============================================================================
// USAGE EXAMPLES
// ==============================================================================

/*
// Example 1: Capture error
try {
  throw new Error("Something went wrong");
} catch (error) {
  errorTracker.captureError(error, ErrorSeverity.HIGH, {
    userId: "user-123",
    component: "RecipeForm",
    action: "submit",
  });
}

// Example 2: Capture message
errorTracker.captureMessage(
  "User attempted unauthorized action",
  ErrorSeverity.MEDIUM,
  { userId: "user-123", action: "delete-recipe" }
);

// Example 3: Set user context
errorTracker.setUser("user-123", "user@example.com", "username");

// Example 4: Add breadcrumb
errorTracker.addBreadcrumb(
  "User clicked submit button",
  "user-action",
  "info",
  { formId: "recipe-form" }
);

// Example 5: Wrap function
const safeFunction = errorTracker.wrapAsync(
  async (data: string) => {
    // Function logic
    return data;
  },
  { component: "MyComponent" }
);

// Example 6: React Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureComponentError(error, errorInfo, this.constructor.name);
  }
}

// Example 7: Initialize global handlers
// In _app.tsx or layout.tsx
initializeGlobalErrorHandlers();
*/
