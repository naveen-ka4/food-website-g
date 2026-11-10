/**
 * Health Check API Endpoint
 * Monitors system health for uptime monitoring services
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    cache: {
      status: "up" | "down";
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  version: string;
  environment: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{
  status: "up" | "down";
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    const supabase = await createClient();

    // Simple query to check connection
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    const latency = Date.now() - start;

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" which is okay for health check
      return {
        status: "down",
        error: error.message,
      };
    }

    return {
      status: "up",
      latency,
    };
  } catch (error) {
    return {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check cache status
 */
function checkCache(): { status: "up" | "down" } {
  // For now, cache is always up (in-memory)
  // When Redis is added, check connection here
  return { status: "up" };
}

/**
 * Get memory usage
 */
function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} {
  if (typeof process === "undefined") {
    return { used: 0, total: 0, percentage: 0 };
  }

  const memoryUsage = process.memoryUsage();
  const used = memoryUsage.heapUsed;
  const total = memoryUsage.heapTotal;
  const percentage = Math.round((used / total) * 100);

  return {
    used: Math.round(used / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage,
  };
}

/**
 * GET /api/health
 */
export async function GET() {
  try {
    const startTime = Date.now();

    // Run health checks
    const [databaseCheck, cacheCheck, memoryUsage] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkCache()),
      Promise.resolve(getMemoryUsage()),
    ]);

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (databaseCheck.status === "down") {
      overallStatus = "unhealthy";
    } else if (memoryUsage.percentage > 90) {
      overallStatus = "degraded";
    } else if (databaseCheck.latency && databaseCheck.latency > 1000) {
      overallStatus = "degraded";
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      checks: {
        database: databaseCheck,
        cache: cacheCheck,
        memory: memoryUsage,
      },
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    const responseTime = Date.now() - startTime;

    // Return appropriate status code
    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(
      {
        ...healthStatus,
        responseTime,
      },
      { status: statusCode }
    );
  } catch (error) {
    // If health check itself fails, return unhealthy
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

/**
 * HEAD /api/health
 * Lightweight health check for simple uptime monitoring
 */
export async function HEAD() {
  try {
    const supabase = await createClient();

    // Quick database check
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return new NextResponse(null, { status: 503 });
    }

    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
