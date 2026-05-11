import "server-only";
import {
  ensureRedisConnection,
  getJsonCache,
  setJsonCache,
  redisClient,
  deleteCacheKeys,
  deleteCacheByPattern,
} from "@/lib/redis";

/**
 * ──────────────────────────────────────────────────────────────
 *  CACHE LAYER
 *  Strong, fast, detailed wrapper around Redis for the whole app.
 *
 *  Features:
 *    • `cached(key, ttl, fetcher)` — get-or-fetch with single-flight
 *      dedup (stampede protection) + in-memory fallback if Redis
 *      is unavailable.
 *    • TTL presets keyed by data volatility.
 *    • Namespaced, versioned key builders (so cache wipes on deploy
 *      are trivial — bump CACHE_VERSION).
 *    • Tag-based invalidation for related entries.
 *    • Lightweight hit/miss counters readable by Developer Console.
 * ──────────────────────────────────────────────────────────────
 */

// Bump this when data shapes change so stale entries invalidate on deploy.
export const CACHE_VERSION = "v1";

export const TTL = {
  /** Lists that update frequently (claims, requests). */
  SHORT: 30,
  /** Dashboard aggregates (counts, stats). */
  MEDIUM: 120,
  /** Heavy analytics, stable schema data. */
  LONG: 600,
  /** Reference data that rarely changes (insurance names, role maps). */
  REFERENCE: 3600,
} as const;

/* ─── Key builders ───────────────────────────────────────────── */

function k(parts: (string | number | null | undefined)[]): string {
  return [CACHE_VERSION, ...parts.filter((p) => p !== null && p !== undefined)].join(":");
}

export const CacheKeys = {
  // Agent
  agentMetrics:   (userId: string) => k(["agent", "metrics", userId]),
  agentClaims:    (userId: string) => k(["agent", "claims", "list", userId]),
  agentClients:   (userId: string) => k(["agent", "clients", "list", userId]),
  agentRequests:  (userId: string) => k(["agent", "requests", "list", userId]),
  agentInsurance: (userId: string) => k(["agent", "insurance", userId]),
  agentProfile:   (userId: string) => k(["agent", "profile", userId]),

  // Hospital
  hospitalClaims: (hospitalId: string | null) => k(["hospital", "claims", hospitalId ?? "all"]),
  hospitalId:     (userId: string) => k(["hospital", "id-of", userId]),

  // Admin agency
  agencyDashboard:   (agencyId: string) => k(["agency", "dashboard", agencyId]),
  agencyClaims:      (agencyId: string) => k(["agency", "claims", agencyId]),
  agencyAgents:      (agencyId: string) => k(["agency", "agents", agencyId]),
  agencyClients:     (agencyId: string) => k(["agency", "clients", agencyId]),
  agencyPerformance: (agencyId: string) => k(["agency", "performance", agencyId]),
  claimDetail:       (claimId: string)  => k(["claim", "detail", claimId]),

  // Developer
  devAnalytics:    () => k(["dev", "analytics"]),
  devSystemHealth: () => k(["dev", "system-health"]),

  // Public / shared
  status:          () => k(["status"]),

  // Cache ops counters (daily bucket)
  statsHit:        (day: string) => k(["stats", "hit", day]),
  statsMiss:       (day: string) => k(["stats", "miss", day]),
  statsError:      (day: string) => k(["stats", "error", day]),
} as const;

/** Invalidate all entries for a given user across agent/agency surfaces. */
export function userCachePattern(userId: string): string {
  return `${CACHE_VERSION}:*${userId}*`;
}

/* ─── Stampede protection (single-flight) ────────────────────── */

type Pending<T> = { promise: Promise<T>; expiresAt: number };
const inflight = new Map<string, Pending<unknown>>();

/* ─── Hit/miss counters ──────────────────────────────────────── */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function incrCounter(key: string) {
  try {
    const ok = await ensureRedisConnection();
    if (!ok || !redisClient) return;
    await redisClient.incr(key);
    // Auto-expire counter after 14 days so old buckets clean themselves.
    await redisClient.expire(key, 14 * 24 * 3600);
  } catch {
    /* non-fatal */
  }
}

function recordHit()   { void incrCounter(CacheKeys.statsHit(todayKey())); }
function recordMiss()  { void incrCounter(CacheKeys.statsMiss(todayKey())); }
function recordError() { void incrCounter(CacheKeys.statsError(todayKey())); }

/* ─── Core: cached() ─────────────────────────────────────────── */

export interface CachedOptions {
  /** Disable Redis read — always run fetcher, but still write. Useful to warm. */
  bypass?: boolean;
  /** When fetcher throws, return this instead of bubbling. Null = rethrow. */
  fallback?: unknown;
}

/**
 * Get-or-fetch pattern with:
 *   1. Redis read
 *   2. Single-flight dedup (same key in parallel → one DB hit)
 *   3. Fetcher execution
 *   4. Write-through to Redis
 *
 * Safe: if Redis is down, degrades to calling fetcher directly.
 * Errors from fetcher are NOT cached.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  options: CachedOptions = {}
): Promise<T> {
  if (!options.bypass) {
    try {
      const hit = await getJsonCache<T>(key);
      if (hit !== null) {
        recordHit();
        return hit;
      }
    } catch {
      recordError();
    }
  }

  recordMiss();

  // Single-flight: if a fetch for the same key is already running, await it.
  const now = Date.now();
  const existing = inflight.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  const promise = (async () => {
    try {
      const fresh = await fetcher();
      // Write-through (fire-and-forget — caller shouldn't wait on cache).
      void setJsonCache(key, fresh, ttlSeconds);
      return fresh;
    } catch (err) {
      if (options.fallback !== undefined) {
        return options.fallback as T;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, {
    promise,
    // Expire single-flight entry slightly beyond fetcher duration so a stuck
    // promise can't poison the map forever.
    expiresAt: now + Math.max(ttlSeconds * 1000, 30_000),
  });

  return promise;
}

/* ─── Invalidation helpers ───────────────────────────────────── */

export async function invalidate(key: string | string[]): Promise<void> {
  const keys = Array.isArray(key) ? key : [key];
  await deleteCacheKeys(keys);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  await deleteCacheByPattern(pattern);
}

/** Invalidate everything cached for a specific user across all surfaces. */
export async function invalidateUser(userId: string): Promise<void> {
  await deleteCacheByPattern(userCachePattern(userId));
}

/** Invalidate everything agency-scoped. */
export async function invalidateAgency(agencyId: string): Promise<void> {
  await deleteCacheByPattern(`${CACHE_VERSION}:*${agencyId}*`);
}

/** Invalidate developer-level aggregates (analytics, system-health). */
export async function invalidateDeveloperCaches(): Promise<void> {
  await deleteCacheKeys([
    CacheKeys.devAnalytics(),
    CacheKeys.devSystemHealth(),
  ]);
}

/* ─── Stats readout for Developer Console ────────────────────── */

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  hitRate: number;       // 0..1
  day: string;           // YYYY-MM-DD
  redisAvailable: boolean;
}

export async function getCacheStats(day: string = todayKey()): Promise<CacheStats> {
  const connected = await ensureRedisConnection();
  if (!connected || !redisClient) {
    return { hits: 0, misses: 0, errors: 0, hitRate: 0, day, redisAvailable: false };
  }

  try {
    const [hitRaw, missRaw, errRaw] = await redisClient.mGet([
      CacheKeys.statsHit(day),
      CacheKeys.statsMiss(day),
      CacheKeys.statsError(day),
    ]);
    const hits   = Number(hitRaw ?? 0);
    const misses = Number(missRaw ?? 0);
    const errors = Number(errRaw ?? 0);
    const total  = hits + misses;
    return {
      hits,
      misses,
      errors,
      hitRate: total > 0 ? hits / total : 0,
      day,
      redisAvailable: true,
    };
  } catch {
    return { hits: 0, misses: 0, errors: 0, hitRate: 0, day, redisAvailable: false };
  }
}
