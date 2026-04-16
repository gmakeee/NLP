import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Force this route to be dynamic so it's never cached by Next.js
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Runs a minimal "SELECT 1" query to verify the database connection.
 *
 * Response shape:
 *   200 → { status: "ok",   db: "connected",    latency_ms: number }
 *   503 → { status: "error", db: "unreachable",  message: string   }
 */
export async function GET() {
  const start = Date.now();

  try {
    // $queryRaw is the cheapest possible round-trip: no table scans.
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";

    // Log server-side for observability; do NOT expose raw PG errors to clients
    console.error("[/api/health] Database ping failed:", message);

    // Detect common Prisma/Postgres connection error codes
    const isTimeout =
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("timed out");

    const isBadConn =
      message.toLowerCase().includes("connection") ||
      message.toLowerCase().includes("econnrefused") ||
      message.toLowerCase().includes("invalid url");

    let hint = "Check server logs for details.";
    if (isBadConn) hint = "Invalid DATABASE_URL or Supabase not reachable.";
    if (isTimeout) hint = "Database connection timed out.";

    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        hint,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
