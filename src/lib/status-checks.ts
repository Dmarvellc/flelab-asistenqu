import "server-only"
import { dbPool } from "@/lib/db"
import { ensureRedisConnection, redisClient } from "@/lib/redis"

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
  history: HistoryPoint[]
  uptimePct: number
}

export interface StatusResult {
  overall: ServiceStatus
  services: ServiceCheck[]
  checkedAt: string
}

/* ─── Helpers ────────────────────────────────────────────────── */
function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Timeout")), ms)),
  ])
}

function toStatus(latencyMs: number, ok: boolean): ServiceStatus {
  if (!ok) return "outage"
  if (latencyMs > 1500) return "degraded"
  return "operational"
}

/* ─── Redis history ──────────────────────────────────────────── */
const HISTORY_KEY = (id: string) => `status:history:${id}`
const HISTORY_MAX = 90

async function saveHistory(id: string, status: ServiceStatus, latencyMs: number) {
  try {
    const ok = await ensureRedisConnection()
    if (!ok || !redisClient) return
    const entry: HistoryPoint = { s: status, l: latencyMs, t: Date.now() }
    await redisClient.lPush(HISTORY_KEY(id), JSON.stringify(entry))
    await redisClient.lTrim(HISTORY_KEY(id), 0, HISTORY_MAX - 1)
    await redisClient.expire(HISTORY_KEY(id), 90 * 24 * 3600)
  } catch { /* non-fatal */ }
}

async function readHistory(id: string): Promise<HistoryPoint[]> {
  try {
    const ok = await ensureRedisConnection()
    if (!ok || !redisClient) return []
    const raw = await redisClient.lRange(HISTORY_KEY(id), 0, HISTORY_MAX - 1)
    return raw.map(r => JSON.parse(r) as HistoryPoint).reverse() // oldest first
  } catch {
    return []
  }
}

function calcUptimePct(history: HistoryPoint[], current: ServiceStatus): number {
  const all = [...history, { s: current, l: 0, t: Date.now() }]
  if (all.length === 0) return 100
  const ok = all.filter(h => h.s === "operational").length
  return Math.round((ok / all.length) * 1000) / 10
}

/* ─── Individual direct checks (no HTTP) ────────────────────── */
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
    const connected = await ensureRedisConnection()
    if (connected && redisClient) {
      ok = (await withTimeout(redisClient.ping())) === "PONG"
    }
  } catch { /* silent */ }
  return {
    id: "cache", name: "Cache Layer", group: "Infrastructure",
    description: "Redis — session cache & performance layer",
    status: toStatus(Date.now() - t, ok),
    latencyMs: Date.now() - t,
  }
}

async function checkTable(
  id: string, name: string, group: string, description: string, table: string,
): Promise<Omit<ServiceCheck, "history" | "uptimePct">> {
  const t = Date.now()
  let ok = false
  try {
    await withTimeout(dbPool.query(`SELECT 1 FROM public.${table} LIMIT 1`))
    ok = true
  } catch { /* silent */ }
  return { id, name, group, description, status: toStatus(Date.now() - t, ok), latencyMs: Date.now() - t }
}

async function checkAI(): Promise<Omit<ServiceCheck, "history" | "uptimePct">> {
  const t = Date.now()
  let ok = false
  try {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error("No key")
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      }),
      3000,
    )
    ok = res.status < 500
  } catch { /* silent */ }
  return {
    id: "ai", name: "AI Assistant", group: "External Services",
    description: "OpenAI — contextual AI assistant engine",
    status: toStatus(Date.now() - t, ok),
    latencyMs: Date.now() - t,
  }
}

/* ─── Run all checks ─────────────────────────────────────────── */
export async function runStatusChecks(): Promise<StatusResult> {
  const rawResults = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkTable("auth",     "Authentication",     "Core Services",  "Login & session management",             "app_user"),
    checkTable("claims",   "Claims Engine",       "Core Services",  "Claim processing & workflow",            "claim"),
    checkTable("agents",   "Agent Portal",        "Portals",        "Agent dashboard & client management",    "app_user"),
    checkTable("hospitals","Hospital Portal",     "Portals",        "Hospital claims & patient verification", "hospital"),
    checkTable("agencies", "Agency Admin Portal", "Portals",        "Agency management & analytics",          "agency"),
    checkAI(),
  ])

  const withHistory: ServiceCheck[] = await Promise.all(
    rawResults.map(async (svc) => {
      await saveHistory(svc.id, svc.status, svc.latencyMs)
      const history = await readHistory(svc.id)
      return { ...svc, history, uptimePct: calcUptimePct(history, svc.status) }
    })
  )

  const overall: ServiceStatus =
    withHistory.some(s => s.status === "outage")   ? "outage"
    : withHistory.some(s => s.status === "degraded") ? "degraded"
    : "operational"

  return { overall, services: withHistory, checkedAt: new Date().toISOString() }
}
