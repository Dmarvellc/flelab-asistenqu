import "server-only";
import crypto from "crypto";
import { dbPool } from "@/lib/db";

/**
 * ──────────────────────────────────────────────────────────────
 *  STRUCTURED LOGGER
 *  Persists errors/events to `public.system_log` and streams to
 *  stdout. Designed to be:
 *    • Non-blocking: DB write is fire-and-forget.
 *    • De-duplicated: identical errors within a rolling window
 *      bump `occurrences` instead of inserting new rows.
 *    • Self-classifying: extracts critical vs info based on scope,
 *      error kind, and caller-provided flags.
 *
 *  Usage:
 *    logError("api.agent.claims.list", err, {
 *      userId, requestPath: "/api/agent/claims", isPublicFacing: true
 *    });
 * ──────────────────────────────────────────────────────────────
 */

export type LogLevel = "info" | "warn" | "error" | "critical";

export interface LogOptions {
  userId?: string | null;
  requestPath?: string | null;
  requestMethod?: string | null;
  /** Extra JSON-serializable context. */
  meta?: Record<string, unknown>;
  /**
   * Mark true when the error occurred handling a public-user request
   * (agent/hospital/status). These power the red banner on the Dev Console.
   */
  isPublicFacing?: boolean;
  /** Force a specific level; otherwise inferred from error shape. */
  level?: LogLevel;
}

/* ─── Fingerprint ────────────────────────────────────────────── */

function fingerprint(scope: string, errorName: string, message: string): string {
  // First 200 chars of message is plenty — avoids giant fingerprints
  // for stringified objects while still catching unique SQL errors.
  const basis = `${scope}|${errorName}|${message.slice(0, 200)}`;
  return crypto.createHash("sha1").update(basis).digest("hex").slice(0, 32);
}

/* ─── Error shape extraction ─────────────────────────────────── */

interface Extracted {
  name: string;
  message: string;
  stack: string | null;
}

function extractError(input: unknown): Extracted {
  if (input instanceof Error) {
    return {
      name: input.name || "Error",
      message: input.message || String(input),
      stack: input.stack ?? null,
    };
  }
  if (typeof input === "string") {
    return { name: "StringError", message: input, stack: null };
  }
  try {
    return { name: "UnknownError", message: JSON.stringify(input), stack: null };
  } catch {
    return { name: "UnknownError", message: String(input), stack: null };
  }
}

/* ─── Level inference ────────────────────────────────────────── */

const CRITICAL_NAMES = new Set([
  "DatabaseError",
  "ConnectionTerminatedError",
  "TimeoutError",
  "ECONNREFUSED",
]);

function inferLevel(
  explicit: LogLevel | undefined,
  err: Extracted,
  isPublicFacing: boolean
): LogLevel {
  if (explicit) return explicit;

  const msg = `${err.name} ${err.message}`.toLowerCase();

  if (CRITICAL_NAMES.has(err.name)) return "critical";
  if (msg.includes("timeout") || msg.includes("econnrefused") || msg.includes("connection")) {
    return "critical";
  }
  if (msg.includes("econnreset") || msg.includes("pool is closed")) {
    return "critical";
  }
  // Public-facing failures auto-escalate from 'error' to 'critical'
  // if they match infrastructure-sounding messages.
  if (isPublicFacing && msg.includes("fetch failed")) return "critical";

  return "error";
}

/* ─── Persistence (upsert by fingerprint) ────────────────────── */

async function persist(
  level: LogLevel,
  scope: string,
  message: string,
  err: Extracted | null,
  opts: LogOptions
): Promise<void> {
  const fp = fingerprint(scope, err?.name ?? "-", message);
  const metaJson = opts.meta ? JSON.stringify(opts.meta) : null;

  try {
    // Upsert-by-fingerprint within a rolling 1h window to prevent log spam.
    // If a matching fingerprint was seen in the last hour: bump occurrences
    // and update last_seen_at. Otherwise, insert a new row.
    await dbPool.query(
      `
      WITH recent AS (
        SELECT log_id
        FROM public.system_log
        WHERE fingerprint = $1
          AND last_seen_at > NOW() - INTERVAL '1 hour'
        ORDER BY last_seen_at DESC
        LIMIT 1
      ),
      bumped AS (
        UPDATE public.system_log
        SET occurrences  = occurrences + 1,
            last_seen_at = NOW(),
            -- If a newer event is more severe, upgrade level.
            level = CASE
              WHEN $2 = 'critical' THEN 'critical'
              WHEN level = 'critical' THEN level
              WHEN $2 = 'error' THEN 'error'
              ELSE level
            END
        WHERE log_id IN (SELECT log_id FROM recent)
        RETURNING log_id
      )
      INSERT INTO public.system_log
        (level, scope, message, error_name, error_stack, user_id,
         request_path, request_method, meta, fingerprint, is_public_facing)
      SELECT $2, $3, $4, $5, $6, $7::uuid, $8, $9, $10::jsonb, $1, $11
      WHERE NOT EXISTS (SELECT 1 FROM bumped);
      `,
      [
        fp,
        level,
        scope,
        message.slice(0, 2000),
        err?.name ?? null,
        err?.stack ? err.stack.slice(0, 4000) : null,
        opts.userId ?? null,
        opts.requestPath ?? null,
        opts.requestMethod ?? null,
        metaJson,
        !!opts.isPublicFacing,
      ]
    );
  } catch (writeErr) {
    // The logger must never throw. Worst case: we lose persistence,
    // but stdout line remains.
    // eslint-disable-next-line no-console
    console.error("[logger] persist failed:", (writeErr as Error).message);
  }
}

/* ─── Public API ─────────────────────────────────────────────── */

/**
 * Log an error (any thrown value). Fire-and-forget safe.
 * Callers should NOT await this — it's already non-blocking via void.
 */
export function logError(scope: string, error: unknown, opts: LogOptions = {}): void {
  const extracted = extractError(error);
  const level = inferLevel(opts.level, extracted, !!opts.isPublicFacing);

  // Always console as well — keeps existing ops behavior intact.
  // eslint-disable-next-line no-console
  console.error(`[${level}] ${scope}: ${extracted.message}`, {
    userId: opts.userId,
    path: opts.requestPath,
    ...opts.meta,
  });

  void persist(level, scope, extracted.message, extracted, opts);
}

/** Log a non-error event (audit trail, deploy markers, etc). */
export function logEvent(
  level: Exclude<LogLevel, "error" | "critical">,
  scope: string,
  message: string,
  opts: LogOptions = {}
): void {
  // eslint-disable-next-line no-console
  console.log(`[${level}] ${scope}: ${message}`);
  void persist(level, scope, message, null, opts);
}

/* ─── Read API (Developer Console) ───────────────────────────── */

export interface LogRow {
  log_id: string;
  level: LogLevel;
  scope: string;
  message: string;
  error_name: string | null;
  user_id: string | null;
  request_path: string | null;
  request_method: string | null;
  occurrences: number;
  is_public_facing: boolean;
  is_acknowledged: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface RecentErrorsOptions {
  sinceHours?: number;
  limit?: number;
  levels?: LogLevel[];
  publicFacingOnly?: boolean;
  unacknowledgedOnly?: boolean;
}

export async function getRecentErrors(options: RecentErrorsOptions = {}): Promise<LogRow[]> {
  const {
    sinceHours = 24,
    limit = 50,
    levels,
    publicFacingOnly,
    unacknowledgedOnly,
  } = options;

  const where: string[] = [`last_seen_at > NOW() - ($1 || ' hours')::interval`];
  const params: (string | number | boolean | string[])[] = [sinceHours];

  if (levels && levels.length > 0) {
    params.push(levels);
    where.push(`level = ANY($${params.length}::text[])`);
  } else {
    where.push(`level IN ('error', 'critical')`);
  }

  if (publicFacingOnly) where.push(`is_public_facing = TRUE`);
  if (unacknowledgedOnly) where.push(`is_acknowledged = FALSE`);

  params.push(limit);
  const limitIdx = params.length;

  try {
    const res = await dbPool.query<LogRow>(
      `
      SELECT
        log_id, level, scope, message, error_name, user_id,
        request_path, request_method, occurrences, is_public_facing,
        is_acknowledged, first_seen_at, last_seen_at
      FROM public.system_log
      WHERE ${where.join(" AND ")}
      ORDER BY last_seen_at DESC
      LIMIT $${limitIdx}
      `,
      params
    );
    return res.rows;
  } catch {
    return [];
  }
}

export interface CriticalAlert {
  logId: string;
  level: LogLevel;
  scope: string;
  message: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  requestPath: string | null;
}

/**
 * Unacknowledged public-facing errors — drives the red banner on
 * the Developer Console. Keep small (top 5) to stay O(1) on the
 * partial index.
 */
export async function getCriticalAlerts(limit = 5): Promise<CriticalAlert[]> {
  try {
    const res = await dbPool.query<{
      log_id: string;
      level: LogLevel;
      scope: string;
      message: string;
      occurrences: number;
      first_seen_at: string;
      last_seen_at: string;
      request_path: string | null;
    }>(
      `
      SELECT log_id, level, scope, message, occurrences,
             first_seen_at, last_seen_at, request_path
      FROM public.system_log
      WHERE is_public_facing = TRUE
        AND is_acknowledged  = FALSE
        AND level IN ('error', 'critical')
      ORDER BY
        CASE level WHEN 'critical' THEN 0 ELSE 1 END,
        last_seen_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return res.rows.map((r) => ({
      logId: r.log_id,
      level: r.level,
      scope: r.scope,
      message: r.message,
      occurrences: r.occurrences,
      firstSeenAt: r.first_seen_at,
      lastSeenAt: r.last_seen_at,
      requestPath: r.request_path,
    }));
  } catch {
    return [];
  }
}

export async function acknowledgeLog(logId: string, acknowledgedBy: string): Promise<boolean> {
  try {
    const res = await dbPool.query(
      `
      UPDATE public.system_log
      SET is_acknowledged = TRUE,
          acknowledged_at = NOW(),
          acknowledged_by = $2::uuid
      WHERE log_id = $1::uuid
      `,
      [logId, acknowledgedBy]
    );
    return (res.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function acknowledgeAllCritical(acknowledgedBy: string): Promise<number> {
  try {
    const res = await dbPool.query(
      `
      UPDATE public.system_log
      SET is_acknowledged = TRUE,
          acknowledged_at = NOW(),
          acknowledged_by = $1::uuid
      WHERE is_public_facing = TRUE
        AND is_acknowledged  = FALSE
        AND level IN ('error', 'critical')
      `,
      [acknowledgedBy]
    );
    return res.rowCount ?? 0;
  } catch {
    return 0;
  }
}

/* ─── Small summary for dashboard header chips ───────────────── */

export interface LogSummary {
  last24h: {
    critical: number;
    error: number;
    warn: number;
  };
  unacknowledgedPublic: number;
  topScopes: Array<{ scope: string; count: number }>;
}

export async function getLogSummary(): Promise<LogSummary> {
  try {
    const [levelCounts, unackRes, topScopesRes] = await Promise.all([
      dbPool.query<{ level: LogLevel; count: string }>(`
        SELECT level, COUNT(*) AS count
        FROM public.system_log
        WHERE last_seen_at > NOW() - INTERVAL '24 hours'
        GROUP BY level
      `),
      dbPool.query<{ count: string }>(`
        SELECT COUNT(*) AS count
        FROM public.system_log
        WHERE is_public_facing = TRUE
          AND is_acknowledged  = FALSE
          AND level IN ('error', 'critical')
      `),
      dbPool.query<{ scope: string; count: string }>(`
        SELECT scope, SUM(occurrences)::int AS count
        FROM public.system_log
        WHERE last_seen_at > NOW() - INTERVAL '24 hours'
          AND level IN ('error', 'critical')
        GROUP BY scope
        ORDER BY count DESC
        LIMIT 5
      `),
    ]);

    const byLevel: Record<string, number> = {};
    for (const row of levelCounts.rows) {
      byLevel[row.level] = Number(row.count);
    }

    return {
      last24h: {
        critical: byLevel.critical ?? 0,
        error: byLevel.error ?? 0,
        warn: byLevel.warn ?? 0,
      },
      unacknowledgedPublic: Number(unackRes.rows[0]?.count ?? 0),
      topScopes: topScopesRes.rows.map((r) => ({
        scope: r.scope,
        count: Number(r.count),
      })),
    };
  } catch {
    return {
      last24h: { critical: 0, error: 0, warn: 0 },
      unacknowledgedPublic: 0,
      topScopes: [],
    };
  }
}
