"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Clock, ArrowLeft
} from "lucide-react"
import type { StatusResponse, ServiceCheck, ServiceStatus, HistoryPoint } from "@/app/api/status/route"

const LOGO_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_logotext.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX2xvZ290ZXh0LnBuZyIsImlhdCI6MTc3MTkwMjgxNywiZXhwIjozMzI3NjM2NjgxN30.BDtpL6pQ6FhAGQF3V05PMC3gHkJ44R2O4vm3yfY2iyQ"

const REFRESH_S = 30
const GROUPS = ["Infrastructure", "Core Services", "Portals", "External Services"]

/* ─── Status config ──────────────────────────────────────────── */
type StatusCfg = {
  label: string
  dot: string
  bar: string
  badge: string
  icon: React.ElementType
  bannerBg: string
  bannerBorder: string
  bannerIcon: string
  bannerHeading: string
  bannerSub: string
  statBg: string
  statText: string
}

const CFG: Record<ServiceStatus, StatusCfg> = {
  operational: {
    label: "Operational",
    dot:    "bg-emerald-500",
    bar:    "bg-emerald-400",
    badge:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon:   CheckCircle2,
    bannerBg:     "bg-emerald-50",
    bannerBorder: "border-emerald-200",
    bannerIcon:   "text-emerald-600",
    bannerHeading: "Semua Sistem Beroperasi Normal",
    bannerSub:     "Seluruh layanan AsistenQu berjalan dengan baik.",
    statBg:   "bg-emerald-50",
    statText: "text-emerald-700",
  },
  degraded: {
    label: "Degraded",
    dot:    "bg-amber-400",
    bar:    "bg-amber-400",
    badge:  "bg-amber-50 text-amber-700 border border-amber-200",
    icon:   AlertTriangle,
    bannerBg:     "bg-amber-50",
    bannerBorder: "border-amber-200",
    bannerIcon:   "text-amber-600",
    bannerHeading: "Gangguan Sebagian Terdeteksi",
    bannerSub:     "Beberapa layanan mengalami perlambatan. Tim sedang menangani.",
    statBg:   "bg-amber-50",
    statText: "text-amber-700",
  },
  outage: {
    label: "Outage",
    dot:    "bg-red-500",
    bar:    "bg-red-400",
    badge:  "bg-red-50 text-red-700 border border-red-200",
    icon:   XCircle,
    bannerBg:     "bg-red-50",
    bannerBorder: "border-red-200",
    bannerIcon:   "text-red-600",
    bannerHeading: "Gangguan Layanan Terdeteksi",
    bannerSub:     "Layanan tertentu tidak dapat diakses. Tim sedang investigasi.",
    statBg:   "bg-red-50",
    statText: "text-red-700",
  },
}

/* ─── Helpers ──────────────────────────────────────────────────── */
function fmtLatency(ms: number, status: ServiceStatus) {
  if (status === "outage") return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function latencyColor(ms: number, status: ServiceStatus) {
  if (status === "outage") return "text-red-500"
  if (ms < 300) return "text-emerald-600"
  if (ms < 900) return "text-amber-600"
  return "text-red-500"
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

/* ─── History bars ─────────────────────────────────────────────── */
function HistoryBars({ history, current }: { history: HistoryPoint[]; current: ServiceStatus }) {
  const BAR_COUNT = 40
  const entries = [...history, { s: current, l: 0, t: Date.now() }]
  const padded: (HistoryPoint | null)[] = entries.length >= BAR_COUNT
    ? entries.slice(-BAR_COUNT)
    : [...Array(BAR_COUNT - entries.length).fill(null), ...entries]

  if (history.length === 0) {
    return (
      <p className="text-[10px] text-gray-300 mt-2 pl-5">
        Belum ada riwayat
      </p>
    )
  }

  return (
    <div className="mt-2.5 pl-5">
      <div className="flex items-end gap-px h-5">
        {padded.map((p, i) => (
          <div
            key={i}
            title={
              p
                ? `${CFG[p.s].label} · ${p.l}ms · ${new Date(p.t).toLocaleString("id-ID")}`
                : "Tidak ada data"
            }
            className={[
              "flex-1 rounded-[1.5px] cursor-default hover:opacity-70 transition-opacity",
              p ? CFG[p.s].bar : "bg-gray-100",
              i === padded.length - 1 ? "h-5" : "h-3.5",
            ].join(" ")}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-300">{entries.length} checks</span>
        <span className="text-[10px] text-gray-400 font-medium">Sekarang</span>
      </div>
    </div>
  )
}

/* ─── Service row ──────────────────────────────────────────────── */
function ServiceRow({ svc, index }: { svc: ServiceCheck; index: number }) {
  const cfg = CFG[svc.status]
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="px-6 py-4 border-t border-gray-50 first:border-t-0"
    >
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {svc.status === "operational" && (
            <span className={`animate-ping absolute inset-0 rounded-full ${cfg.dot} opacity-40`} />
          )}
          <span className={`relative rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
        </span>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900">{svc.name}</span>
          <span className="text-xs text-gray-400 ml-2 hidden sm:inline">{svc.description}</span>
        </div>

        {/* Uptime */}
        <span className="hidden md:block text-xs text-gray-400 tabular-nums">
          {svc.uptimePct}%
        </span>

        {/* Latency */}
        <span className={`text-xs font-mono font-bold tabular-nums hidden sm:block ${latencyColor(svc.latencyMs, svc.status)}`}>
          {fmtLatency(svc.latencyMs, svc.status)}
        </span>

        {/* Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.badge}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </div>

      <HistoryBars history={svc.history} current={svc.status} />
    </motion.div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function StatusPage() {
  const [data, setData]           = useState<StatusResponse | null>(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefresh]  = useState(false)
  const [countdown, setCountdown] = useState(REFRESH_S)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setRefresh(true)
    try {
      const res = await fetch("/api/status", { cache: "no-store" })
      if (res.ok) setData(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefresh(false)
      setCountdown(REFRESH_S)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchStatus(); return REFRESH_S }
        return c - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchStatus])

  const overall = data?.overall ?? "operational"
  const cfg     = CFG[overall]
  const BannerIcon = cfg.icon

  const grouped = GROUPS.map(g => ({
    name: g,
    services: data?.services.filter(s => s.group === g) ?? [],
  })).filter(g => g.services.length > 0)

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <img src={LOGO_URL} alt="AsistenQu" className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-gray-200 select-none text-lg">/</span>
            <span className="text-sm font-semibold text-gray-500">Status</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{countdown}s</span>
            </div>
            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Status banner ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="sk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ) : (
            <motion.div
              key={overall}
              initial={{ opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`${cfg.bannerBg} border ${cfg.bannerBorder} rounded-2xl px-7 py-6 flex items-center gap-5`}
            >
              <div className="relative shrink-0">
                {overall === "operational" && (
                  <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping rounded-xl" />
                )}
                <div className="w-11 h-11 rounded-xl bg-white/60 flex items-center justify-center relative">
                  <BannerIcon className={`h-5 w-5 ${cfg.bannerIcon}`} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-gray-900 tracking-tight">
                  {cfg.bannerHeading}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">{cfg.bannerSub}</p>
                {data?.checkedAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Diperbarui {fmtTime(data.checkedAt)}
                  </p>
                )}
              </div>

              {data && (
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">
                    {data.services.filter(s => s.status === "operational").length}
                    <span className="text-gray-300">/{data.services.length}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">layanan aktif</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick stat cards ───────────────────────────────────── */}
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { key: "operational" as const, label: "Operational", Icon: CheckCircle2 },
              { key: "degraded"    as const, label: "Degraded",    Icon: AlertTriangle },
              { key: "outage"      as const, label: "Outage",      Icon: XCircle },
            ].map(({ key, label, Icon }) => {
              const count = data.services.filter(s => s.status === key).length
              const c = CFG[key]
              return (
                <div key={key} className={`${c.statBg} border ${c.bannerBorder} rounded-xl px-5 py-4 flex items-center gap-3`}>
                  <Icon className={`h-4 w-4 shrink-0 ${c.bannerIcon}`} />
                  <div>
                    <p className={`text-2xl font-black tabular-nums leading-none ${c.statText}`}>{count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}

        {/* ── Service groups ─────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group, gi) => (
              <motion.div
                key={group.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + gi * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Group header */}
                <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {group.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {(["operational", "degraded", "outage"] as const).map(s => {
                      const n = group.services.filter(svc => svc.status === s).length
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

                <div>
                  {group.services.map((svc, idx) => (
                    <ServiceRow key={svc.id} svc={svc} index={idx} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Incident history ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Riwayat Insiden
            </h2>
          </div>
          <div className="px-6 py-12 text-center">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Tidak ada insiden</p>
            <p className="text-xs text-gray-400 mt-1">Belum ada gangguan yang dilaporkan.</p>
          </div>
        </motion.div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end text-xs text-gray-400 pb-4 gap-4">
          <Link href="/" className="flex items-center gap-1.5 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Kembali
          </Link>
          <a href="mailto:hello@asistenqu.com" className="hover:text-gray-700 transition-colors">
            Hubungi Support
          </a>
        </div>
      </div>
    </div>
  )
}
