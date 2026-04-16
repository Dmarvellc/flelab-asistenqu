/**
 * /status — fully server-rendered, no client fetch.
 * Data is fetched server-side and re-validated every 30 s via ISR.
 */
import { runStatusChecks, type ServiceCheck, type ServiceStatus, type HistoryPoint } from "@/lib/status-checks"
import Link from "next/link"
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Activity } from "lucide-react"

export const dynamic = "force-dynamic"   // always fresh data per request
export const revalidate = 0

/* ─── Status config ──────────────────────────────────────────── */
const CFG = {
  operational: {
    label: "Operational",
    dot:         "bg-emerald-500",
    bar:         "bg-emerald-500",
    badge:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon:        CheckCircle2,
    bannerBg:    "bg-emerald-50 border-emerald-200",
    bannerIcon:  "text-emerald-600",
    heading:     "All Systems Operational",
    sub:         "Semua layanan AsistenQu berjalan dengan baik.",
  },
  degraded: {
    label: "Degraded",
    dot:         "bg-amber-400",
    bar:         "bg-amber-400",
    badge:       "bg-amber-50 text-amber-700 border-amber-200",
    icon:        AlertTriangle,
    bannerBg:    "bg-amber-50 border-amber-200",
    bannerIcon:  "text-amber-600",
    heading:     "Partial Degradation",
    sub:         "Beberapa layanan mengalami perlambatan.",
  },
  outage: {
    label: "Outage",
    dot:         "bg-red-500",
    bar:         "bg-red-500",
    badge:       "bg-red-50 text-red-700 border-red-200",
    icon:        XCircle,
    bannerBg:    "bg-red-50 border-red-200",
    bannerIcon:  "text-red-600",
    heading:     "Service Disruption",
    sub:         "Layanan tertentu tidak dapat diakses. Tim sedang investigasi.",
  },
} as const

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtLatency(ms: number, status: ServiceStatus) {
  if (status === "outage") return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
function latencyClass(ms: number, status: ServiceStatus) {
  if (status === "outage") return "text-red-500"
  if (ms < 300) return "text-emerald-600"
  if (ms < 900) return "text-amber-600"
  return "text-red-500"
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

/* ─── 90-bar uptime chart ───────────────────────────────────── */
function UptimeBars({ history, current }: { history: HistoryPoint[]; current: ServiceStatus }) {
  const BAR_N = 90
  const entries: (HistoryPoint | null)[] = [
    ...Array(Math.max(0, BAR_N - history.length - 1)).fill(null),
    ...history,
    { s: current, l: 0, t: Date.now() },
  ]

  return (
    <div className="mt-3">
      <div className="flex items-end gap-[2px] h-8">
        {entries.map((p, i) => {
          const isToday = i === entries.length - 1
          const colorClass = p ? CFG[p.s].bar : "bg-gray-100"
          return (
            <div
              key={i}
              title={
                p
                  ? `${CFG[p.s].label} · ${p.l}ms · ${new Date(p.t).toLocaleString("id-ID")}`
                  : "No data"
              }
              className={[
                "flex-1 rounded-[2px] transition-opacity hover:opacity-60 cursor-default",
                colorClass,
                isToday ? "h-8" : "h-5",
              ].join(" ")}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-gray-300">90 checks ago</span>
        <span className="text-[10px] text-gray-400 font-medium">Now</span>
      </div>
    </div>
  )
}

/* ─── Service row ────────────────────────────────────────────── */
function ServiceRow({ svc }: { svc: ServiceCheck }) {
  const cfg = CFG[svc.status]
  const Icon = cfg.icon
  return (
    <div className="px-6 py-5 border-t border-gray-50 first:border-t-0">
      <div className="flex items-center gap-3">
        {/* Dot */}
        <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

        {/* Name + desc */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{svc.name}</span>
          <span className="hidden sm:inline text-xs text-gray-400 ml-2">{svc.description}</span>
        </div>

        {/* Uptime % */}
        <span className="hidden md:block text-xs text-gray-400 tabular-nums w-14 text-right">
          {svc.uptimePct}%
        </span>

        {/* Latency */}
        <span className={`hidden sm:block text-xs font-mono font-bold tabular-nums w-14 text-right ${latencyClass(svc.latencyMs, svc.status)}`}>
          {fmtLatency(svc.latencyMs, svc.status)}
        </span>

        {/* Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badge}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      <UptimeBars history={svc.history} current={svc.status} />
    </div>
  )
}

/* ─── Group card ─────────────────────────────────────────────── */
const GROUPS = ["Infrastructure", "Core Services", "Portals", "External Services"]

function GroupCard({ name, services }: { name: string; services: ServiceCheck[] }) {
  if (services.length === 0) return null
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{name}</h2>
        <div className="flex items-center gap-2">
          {(["operational", "degraded", "outage"] as const).map(s => {
            const n = services.filter(sv => sv.status === s).length
            if (!n) return null
            return (
              <span key={s} className="flex items-center gap-1 text-[10px] text-gray-400">
                <span className={`w-1.5 h-1.5 rounded-full ${CFG[s].dot}`} />
                {n}
              </span>
            )
          })}
        </div>
      </div>
      {services.map(svc => <ServiceRow key={svc.id} svc={svc} />)}
    </div>
  )
}

/* ─── Page (Server Component) ────────────────────────────────── */
export default async function StatusPage() {
  const { overall, services, checkedAt } = await runStatusChecks()

  const cfg = CFG[overall]
  const BannerIcon = cfg.icon
  const opCount = services.filter(s => s.status === "operational").length

  return (
    <div className="min-h-screen bg-gray-50/40 font-sans">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-[0_1px_10px_rgba(0,0,0,0.04)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-extrabold tracking-tighter text-gray-900 hover:text-blue-600 transition-colors">
              AsistenQu
            </Link>
            <span className="text-gray-200 select-none">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
              <Activity className="h-3.5 w-3.5" />
              Status
            </span>
          </div>

          {/* Overall dot */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${cfg.dot} ${overall === "operational" ? "animate-pulse" : ""}`} />
            <span className="text-xs font-semibold text-gray-600">{cfg.label}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* ── Banner ─────────────────────────────────────────────── */}
        <div className={`border rounded-2xl px-7 py-6 flex items-center gap-5 ${cfg.bannerBg}`}>
          <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
            <BannerIcon className={`h-5 w-5 ${cfg.bannerIcon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">{cfg.heading}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{cfg.sub}</p>
            <p className="text-xs text-gray-400 mt-1">Diperbarui {fmtTime(checkedAt)}</p>
          </div>
          <div className="hidden sm:block text-right shrink-0">
            <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">
              {opCount}<span className="text-gray-300">/{services.length}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">layanan aktif</p>
          </div>
        </div>

        {/* ── Quick stat cards ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {(["operational", "degraded", "outage"] as const).map(s => {
            const count = services.filter(sv => sv.status === s).length
            const c = CFG[s]
            const Icon = c.icon
            return (
              <div key={s} className={`border rounded-xl px-5 py-4 flex items-center gap-3 ${c.bannerBg}`}>
                <Icon className={`h-4 w-4 shrink-0 ${c.bannerIcon}`} />
                <div>
                  <p className={`text-2xl font-black tabular-nums leading-none ${c.bannerIcon}`}>{count}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{s}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Service groups ──────────────────────────────────────── */}
        <div className="space-y-4">
          {GROUPS.map(g => (
            <GroupCard
              key={g}
              name={g}
              services={services.filter(s => s.group === g)}
            />
          ))}
        </div>

        {/* ── No incidents ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Incident History</h2>
          </div>
          <div className="px-6 py-10 text-center">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No incidents reported</p>
            <p className="text-xs text-gray-400 mt-1">Belum ada gangguan yang dilaporkan.</p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-gray-400 pb-4">
          <Link href="/" className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Kembali ke beranda
          </Link>
          <div className="flex items-center gap-4">
            <span className="tabular-nums">Refreshed: {fmtTime(checkedAt)}</span>
            <a href="mailto:hello@asistenqu.com" className="hover:text-gray-700 transition-colors">
              Hubungi Support
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
