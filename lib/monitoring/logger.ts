/**
 * Structured Logging System
 * Provides consistent, searchable logs for production monitoring
 */

// ==============================================================================
// LOG LEVELS
// ==============================================================================

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

// ==============================================================================
// LOG CONTEXT
// ==============================================================================

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

// ==============================================================================
// LOG ENTRY
// ==============================================================================

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    memory?: number;
  };
  metadata?: Record<string, any>;
}

// ==============================================================================
// LOGGER CLASS
// ==============================================================================

class Logger {
  private minLevel: LogLevel = LogLevel.INFO;
  private enableConsole: boolean = true;
  private enableRemote: boolean = false;
  private remoteEndpoint?: string;

  constructor() {
    // Configure based on environment
    if (typeof window === "undefined") {
      // Server-side
      this.minLevel = process.env.LOG_LEVEL as LogLevel || LogLevel.INFO;
      this.enableRemote = process.env.ENABLE_REMOTE_LOGGING === "true";
      this.remoteEndpoint = process.env.LOGGING_ENDPOINT;
    } else {
      // Client-side
      this.minLevel = LogLevel.WARN; // Only warnings and errors on client
      this.enableConsole = process.env.NODE_ENV === "development";
    }
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        code: (error as any).code,
      };
    }

    return entry;
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = ["password", "token", "apiKey", "secret", "creditCard"];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    const minIndex = levels.indexOf(this.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }

  /**
   * Format log for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const emoji = {
      debug: "🔍",
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
      fatal: "💀",
    };

    const parts = [
      emoji[entry.level],
      `[${entry.level.toUpperCase()}]`,
      entry.timestamp,
      entry.message,
    ];

    if (entry.context?.userId) {
      parts.push(`(User: ${entry.context.userId})`);
    }

    if (entry.error) {
      parts.push(`\nError: ${entry.error.message}`);
      if (entry.error.stack) {
        parts.push(`\nStack: ${entry.error.stack}`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Write log to console
   */
  private writeToConsole(entry: LogEntry): void {
    if (!this.enableConsole) return;

    const formatted = this.formatForConsole(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted);
        break;
    }
  }

  /**
   * Send log to remote service (e.g., Sentry, LogRocket, Datadog)
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.enableRemote || !this.remoteEndpoint) return;

    try {
      await fetch(this.remoteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fail silently to avoid infinite loop
      console.error("Failed to send log to remote:", error);
    }
  }

  /**
   * Log at specific level
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createEntry(level, message, context, error, metadata);

    this.writeToConsole(entry);

    // Send to remote asynchronously (don't await)
    if (this.enableRemote) {
      this.sendToRemote(entry).catch(() => {
        // Ignore errors
      });
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, undefined, metadata);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, undefined, metadata);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error, metadata);
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error, metadata);
  }

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext
  ): void {
    this.info(`API ${method} ${path} - ${statusCode}`, {
      ...context,
      method,
      path,
    }, {
      statusCode,
      duration,
    });
  }

  /**
   * Log database query
   */
  dbQuery(
    query: string,
    duration: number,
    rowCount?: number,
    context?: LogContext
  ): void {
    this.debug(`DB Query: ${query}`, context, {
      duration,
      rowCount,
    });
  }

  /**
   * Log security event
   */
  security(
    event: string,
    severity: "low" | "medium" | "high" | "critical",
    context?: LogContext,
    metadata?: Record<string, any>
  ): void {
    const level = severity === "critical" || severity === "high" 
      ? LogLevel.ERROR 
      : LogLevel.WARN;

    this.log(level, `Security: ${event}`, context, undefined, {
      ...metadata,
      severity,
    });
  }

  /**
   * Log performance metric
   */
  performance(
    metric: string,
    value: number,
    unit: "ms" | "bytes" | "count" = "ms",
    context?: LogContext
  ): void {
    this.info(`Performance: ${metric}`, context, {
      metric,
      value,
      unit,
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger();
    const originalLog = childLogger.log.bind(childLogger);

    childLogger.log = (level, message, context, error, metadata) => {
      originalLog(level, message, { ...additionalContext, ...context }, error, metadata);
    };

    return childLogger;
  }
}

// ==============================================================================
// SINGLETON INSTANCE
// ==============================================================================

let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

// ==============================================================================
// CONVENIENCE EXPORTS
// ==============================================================================

export const logger = getLogger();

// ==============================================================================
// USAGE EXAMPLES
// ==============================================================================

/*
// Example 1: Basic logging
logger.info("User logged in", { userId: "user-123" });

// Example 2: Error logging
try {
  throw new Error("Something went wrong");
} catch (error) {
  logger.error("Failed to process request", error, { userId: "user-123" });
}

// Example 3: Security event
logger.security("Unauthorized access attempt", "high", {
  userId: "user-123",
  ip: "192.168.1.1",
  path: "/admin",
});

// Example 4: Performance tracking
const start = Date.now();
await someFunction();
const duration = Date.now() - start;
logger.performance("Function execution time", duration);

// Example 5: API request logging
logger.apiRequest("GET", "/api/recipes", 200, 150, {
  userId: "user-123",
});

// Example 6: Child logger
const userLogger = logger.child({ userId: "user-123", sessionId: "session-abc" });
userLogger.info("Action performed"); // Automatically includes userId and sessionId
*/
