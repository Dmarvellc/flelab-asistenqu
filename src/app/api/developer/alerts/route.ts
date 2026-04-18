import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  acknowledgeAllCritical,
  acknowledgeLog,
  getCriticalAlerts,
  getRecentErrors,
  logError,
} from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["developer", "super_admin"]);

/**
 * GET /api/developer/alerts
 *   ?mode=critical   → unacknowledged public-facing critical errors (for banner)
 *   ?mode=recent     → last 24h errors (for log feed)
 *   &limit=N
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "critical";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "10", 10), 1), 100);

  try {
    if (mode === "recent") {
      const errors = await getRecentErrors({ sinceHours: 24, limit });
      return NextResponse.json({ errors });
    }

    const alerts = await getCriticalAlerts(limit);
    return NextResponse.json({ alerts });
  } catch (err) {
    logError("api.developer.alerts.get", err, {
      requestPath: "/api/developer/alerts",
      requestMethod: "GET",
      userId: session.userId,
    });
    return NextResponse.json({ error: "Failed to load alerts" }, { status: 500 });
  }
}

const ackSchema = z.union([
  z.object({ action: z.literal("ack"), logId: z.string().uuid() }),
  z.object({ action: z.literal("ack-all") }),
]);

/**
 * POST /api/developer/alerts
 *   { action: "ack", logId }       → mark one log acknowledged
 *   { action: "ack-all" }          → mark all public-facing critical acked
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.has(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "ack") {
      const ok = await acknowledgeLog(parsed.data.logId, session.userId);
      return NextResponse.json({ ok });
    }
    const count = await acknowledgeAllCritical(session.userId);
    return NextResponse.json({ ok: true, acknowledged: count });
  } catch (err) {
    logError("api.developer.alerts.post", err, {
      requestPath: "/api/developer/alerts",
      requestMethod: "POST",
      userId: session.userId,
    });
    return NextResponse.json({ error: "Failed to acknowledge" }, { status: 500 });
  }
}
