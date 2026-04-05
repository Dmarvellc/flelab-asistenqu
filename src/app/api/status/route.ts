import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"
import { ensureRedisConnection, redisClient } from "@/lib/redis"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type ServiceStatus = "operational" | "degraded" | "outage"

export interface HistoryPoint {
  s: ServiceStatus
  l: number   // latency ms
  t: number   // unix ms timestamp
}

export interface ServiceCheck {
  id: string
  name: string
  group: string
  description: string
  status: ServiceStatus
  latencyMs: number
  history: HistoryPoint[]   // real data from Redis — oldest first
  uptimePct: number         // real: % of historical checks that were operational
}

export interface StatusResponse {
  overall: ServiceStatus
  services: ServiceCheck[]
  checkedAt: string
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("Timeout")), ms)
    ),
  ])
}

function toStatus(latencyMs: number, ok: boolean): ServiceStatus {
  if (!ok) return "outage"
  if (latencyMs > 1500) return "degraded"
  return "operational"
}

/* ─── Redis history helpers ────────────────────────────────────── */
const HISTORY_KEY = (id: string) => `status:history:${id}`
const HISTORY_MAX = 60   // keep last 60 check results per service

async function saveHistory(id: string, status: ServiceStatus, latencyMs: number) {
  try {
    await ensureRedisConnection()
    const entry: HistoryPoint = { s: status, l: latencyMs, t: Date.now() }
    const key = HISTORY_KEY(id)
    await redisClient.lPush(key, JSON.stringify(entry))
    await redisClient.lTrim(key, 0, HISTORY_MAX - 1)
    await redisClient.expire(key, 30 * 24 * 3600) // 30 day TTL
  } catch { /* non-fatal */ }
}

async function readHistory(id: string): Promise<HistoryPoint[]> {
  try {
    await ensureRedisConnection()
    const raw = await redisClient.lRange(HISTORY_KEY(id), 0, HISTORY_MAX - 1)
    // lPush prepends, so index 0 = newest. Reverse to get oldest-first for the bar chart.
    return raw.map(r => JSON.parse(r) as HistoryPoint).reverse()
  } catch {
    return []
  }
}

function calcUptimePct(history: HistoryPoint[], current: ServiceStatus): number {
  // Include the current check in the calculation
  const all = [...history, { s: current, l: 0, t: Date.now() }]
  if (all.length === 0) return 100
  const ok = all.filter(h => h.s === "operational").length
  return Math.round((ok / all.length) * 1000) / 10
}

/* ─── Individual checks ────────────────────────────────────────── */
async function checkDatabase(): Promise<Omit<ServiceCheck, "history" | "uptimePct">> {
  const t = Date.now()
  let ok = false
  try {
    await withTimeout(dbPool.query("SELECT 1 AS ok"))
    ok = true
  } catch { /* silent */ }
  return {
    id: "database", name: "Database", group: "Infrastructure",
    description: "PostgreSQL — primary data store",
    status: toStatus(Date.now() - t, ok),
    latencyMs: Date.now() - t,
  }
}

async function checkRedis(): Promise<Omit<ServiceCheck, "history" | "uptimePct">> {
  const t = Date.now()
  let ok = false
  try {
    await ensureRedisConnection()
    ok = (await withTimeout(redisClient.ping())) === "PONG"
  } catch { /* silent */ }
  return {
    id: "cache", name: "Cache Layer", group: "Infrastructure",
    description: "Redis — session cache & performance layer",
    status: toStatus(Date.now() - t, ok),
    latencyMs: Date.now() - t,
  }
}

async function checkEndpoint(
  id: string, name: string, group: string, description: string,
  origin: string, path: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, string>,
): Promise<Omit<ServiceCheck, "history" | "uptimePct">> {
  const t = Date.now()
  let ok = false
  try {
    const res = await withTimeout(
      fetch(`${origin}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      })
    )
    ok = res.status < 500
  } catch { /* network / timeout */ }
  return {
    id, name, group, description,
    status: toStatus(Date.now() - t, ok),
    latencyMs: Date.now() - t,
  }
}

/* ─── Route handler ────────────────────────────────────────────── */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin

  // 1. Run all checks in parallel
  const rawResults = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkEndpoint(
      "auth", "Authentication", "Core Services",
      "Login & session management",
      origin, "/api/auth/login", "POST",
      { email: "status@check.internal", password: "probe", portal: "agent" }
    ),
    checkEndpoint(
      "storage", "File Storage", "External Services",
      "Supabase Storage — documents & images",
      origin, "/api/hospitals"
    ),
    checkEndpoint(
      "agent-portal", "Agent Portal", "Portals",
      "Agent dashboard & claim management",
      origin, "/api/agent/metrics"
    ),
    checkEndpoint(
      "hospital-portal", "Hospital Portal", "Portals",
      "Hospital claims & patient verification",
      origin, "/api/hospital/claims"
    ),
    checkEndpoint(
      "agency-portal", "Agency Admin Portal", "Portals",
      "Agency management & performance analytics",
      origin, "/api/admin-agency/profile"
    ),
    checkEndpoint(
      "developer", "Developer Console", "Portals",
      "Platform configuration & developer tools",
      origin, "/api/developer/stats"
    ),
  ])

  // 2. Save to Redis history & read existing history in parallel
  const withHistory: ServiceCheck[] = await Promise.all(
    rawResults.map(async (svc) => {
      await saveHistory(svc.id, svc.status, svc.latencyMs)
      const history = await readHistory(svc.id)
      return {
        ...svc,
        history,
        uptimePct: calcUptimePct(history, svc.status),
      }
    })
  )

  // 3. Overall status
  const overall: ServiceStatus =
    withHistory.some(s => s.status === "outage")
      ? "outage"
      : withHistory.some(s => s.status === "degraded")
        ? "degraded"
        : "operational"

  return NextResponse.json(
    { overall, services: withHistory, checkedAt: new Date().toISOString() } satisfies StatusResponse,
    { headers: { "Cache-Control": "no-store, no-cache" } }
  )
}
