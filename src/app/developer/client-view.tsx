"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  Users, Activity, Clock, Building2, Briefcase, FileText,
  ArrowRight, RefreshCw, TrendingUp, TrendingDown, UserCheck,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, BarChart2,
  Sparkles, Zap, Command,
} from "lucide-react";
import { CriticalAlertsBanner } from "@/components/developer/critical-alerts-banner";

/* ─── Types ─────────────────────────────────────────────────────── */
interface DailyPoint  { date: string; count: number }
interface StagePoint  { stage: string; count: number }
interface RecentUser  { user_id: string; email: string; role: string; status: string; created_at: string; full_name?: string }
interface ApprovalRate { approved: number; rejected: number; pending: number }

interface Analytics {
  dailyRegistrations: DailyPoint[]
  claimsByStage: StagePoint[]
  roleStats: Record<string, number>
  usersByStatus: Record<string, number>
  platformTotals: {
    agencies: number; hospitals: number
    activeAgents: number; totalAgents: number
    totalClaims: number; totalUsers: number
    activeUsers: number; pendingUsers: number
  }
  recentUsers: RecentUser[]
  approvalRate30d: ApprovalRate
  sparklines?: {
    users: number[]; agents: number[]; agencies: number[]; hospitals: number[]
  }
  wow?: { current: number; previous: number }
  peakHour?: { hour: number; count: number } | null
}

/* ─── Helpers ───────────────────────────────────────────────────── */
const ROLE_COLORS: Record<string, string> = {
  agent:           "#1a56db",
  admin_agency:    "#7c3aed",
  hospital_admin:  "#059669",
  insurance_admin: "#d97706",
  developer:       "#111827",
  super_admin:     "#6b7280",
}
const DEFAULT_COLOR = "#9ca3af"

const STATUS_CFG = {
  ACTIVE:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  PENDING:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"  },
  REJECTED:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"    },
  SUSPENDED: { bg: "bg-gray-100",   text: "text-gray-600",    dot: "bg-gray-400"   },
} as const

const STAGE_LABELS: Record<string, string> = {
  DRAFT_AGENT:      "Draft",
  PENDING_LOG:      "Pending Log",
  LOG_ISSUED:       "Log Issued",
  PENDING_REVIEW:   "Pending Review",
  APPROVED:         "Approved",
  REJECTED:         "Rejected",
  COMPLETED:        "Completed",
}

function fmtRole(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return "baru saja"
  if (m < 60)  return `${m}m lalu`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}j lalu`
  return `${Math.floor(h / 24)}h lalu`
}

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

/* ─── Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ data, color = "#1a56db" }: { data: number[]; color?: string }) {
  const points = useMemo(() => data.map((v, i) => ({ i, v })), [data])
  if (!data.length) return <div className="h-8" />
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ─── Stat Card w/ Sparkline + Delta ───────────────────────────── */
function StatCard({
  label, value, icon: Icon, color = "text-gray-900", accent = "#111827",
  spark, delta, loading, href, bgClass = "bg-white",
}: {
  label: string; value: number | string | undefined
  icon: React.ElementType; color?: string; accent?: string
  spark?: number[]; delta?: number; loading?: boolean; href?: string
  bgClass?: string
}) {
  const showDelta = typeof delta === "number" && !loading
  const deltaPositive = (delta ?? 0) >= 0

  const content = (
    <div className={`group relative rounded-2xl border border-gray-100/50 shadow-sm px-5 py-4 flex flex-col justify-between h-full overflow-hidden ${bgClass} ${href ? "hover:border-gray-200 hover:shadow-md transition-all scale-100 hover:scale-[1.02]" : ""}`}>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
          <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
        </div>
        {loading
          ? <div className="h-8 w-20 bg-gray-100 animate-pulse rounded-lg" />
          : (
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-black tracking-tight leading-none ${color}`}>{value ?? "—"}</p>
              {showDelta && delta !== 0 && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${deltaPositive ? "text-emerald-600" : "text-red-500"}`}>
                  {deltaPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {deltaPositive ? "+" : ""}{delta}%
                </span>
              )}
            </div>
          )
        }
      </div>
      <div>
        {spark && spark.length > 0 && !loading && (
          <div className="-mx-1 mt-3 opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline data={spark} color={accent} />
          </div>
        )}
      </div>
    </div>
  )

  return href ? <Link href={href} className="block h-full">{content}</Link> : <div className="h-full">{content}</div>
}

/* ─── Bar Tooltip ───────────────────────────────────────────────── */
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">{payload[0].value} user baru</p>
    </div>
  )
}

/* ─── Claims Stage Bar ──────────────────────────────────────────── */
function StageBar({ stage, count, max }: { stage: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  const label = STAGE_LABELS[stage] ?? stage.replace(/_/g, " ")

  const stageColors: Record<string, string> = {
    APPROVED: "bg-emerald-400", COMPLETED: "bg-emerald-500",
    REJECTED: "bg-red-400",
    PENDING_LOG: "bg-amber-400", PENDING_REVIEW: "bg-amber-500",
    DRAFT_AGENT: "bg-gray-300", LOG_ISSUED: "bg-blue-400",
  }
  const barColor = stageColors[stage] ?? "bg-gray-300"

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{count}</span>
    </div>
  )
}

/* ─── Smart Insights (rule-based) ──────────────────────────────── */
function buildInsights(data: Analytics | null): Array<{ tone: "warn" | "good" | "info"; msg: string }> {
  if (!data) return []
  const out: Array<{ tone: "warn" | "good" | "info"; msg: string }> = []
  const pt = data.platformTotals
  const wow = data.wow

  if (pt.pendingUsers > 0) {
    out.push({
      tone: pt.pendingUsers > 10 ? "warn" : "info",
      msg: `${pt.pendingUsers} user menunggu approval${pt.pendingUsers > 10 ? " — butuh review segera" : ""}.`,
    })
  }

  if (wow) {
    const d = pctDelta(wow.current, wow.previous)
    if (d >= 20) out.push({ tone: "good", msg: `Registrasi naik ${d}% minggu ini (${wow.current} vs ${wow.previous}).` })
    else if (d <= -20) out.push({ tone: "warn", msg: `Registrasi turun ${Math.abs(d)}% minggu ini.` })
  }

  const ar = data.approvalRate30d
  const arTotal = ar.approved + ar.rejected + ar.pending
  if (arTotal > 0) {
    const pct = Math.round((ar.approved / arTotal) * 100)
    if (pct >= 90) out.push({ tone: "good", msg: `Approval rate ${pct}% — kualitas pendaftaran tinggi.` })
    else if (pct < 50) out.push({ tone: "warn", msg: `Approval rate hanya ${pct}% — cek kualitas pendaftaran.` })
  }

  if (pt.totalAgents > 0 && pt.activeAgents / pt.totalAgents < 0.5) {
    out.push({ tone: "warn", msg: `Hanya ${pt.activeAgents}/${pt.totalAgents} agent aktif.` })
  }

  if (data.peakHour) {
    const h = data.peakHour.hour
    out.push({ tone: "info", msg: `Peak registrasi pukul ${String(h).padStart(2,"0")}:00 (${data.peakHour.count} user).` })
  }

  if (out.length === 0) out.push({ tone: "good", msg: "Semua metrik dalam rentang normal." })
  return out.slice(0, 4)
}

/* ─── Page ───────────────────────────────────────────────────────── */
export function DeveloperClientView({ initialData }: { initialData?: Analytics | null }) {
  const [data, setData]       = useState<Analytics | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date())

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/analytics", { cache: "no-store" })
      if (res.ok) {
        setData(await res.json())
        setLastUpdate(new Date())
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const pt = data?.platformTotals
  const wowDelta = data?.wow ? pctDelta(data.wow.current, data.wow.previous) : undefined

  /* Velocity: avg users/day last 7d */
  const velocity7d = data?.wow ? (data.wow.current / 7).toFixed(1) : "0"

  /* Donut data */
  const roleDonut = Object.entries(data?.roleStats ?? {}).map(([role, count]) => ({
    name: fmtRole(role), count, fill: ROLE_COLORS[role] ?? DEFAULT_COLOR,
  }))

  /* Max for claims stage bar */
  const claimsMax = Math.max(...(data?.claimsByStage ?? []).map(s => s.count), 1)

  /* Approval rate */
  const ar = data?.approvalRate30d
  const arTotal = (ar?.approved ?? 0) + (ar?.rejected ?? 0) + (ar?.pending ?? 0)
  const approvalPct = arTotal > 0 ? Math.round(((ar?.approved ?? 0) / arTotal) * 100) : 0

  const insights = useMemo(() => buildInsights(data), [data])

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Developer Console</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-gray-400 border border-gray-200 rounded-lg px-2 py-1">
            <Command className="h-3 w-3" /> K
          </span>
          <button
            onClick={() => { setLoading(true); fetchAnalytics() }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Critical Alerts Banner ──────────────────────────────── */}
      <CriticalAlertsBanner />

      {/* ── Velocity Hero Strip (Clean Minimal) ─────────────────── */}
      <div className="bg-white rounded-2xl px-6 py-6 border border-gray-100 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 sm:gap-10 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Velocity 7d</p>
              <p className="text-2xl font-black tabular-nums text-gray-900">{velocity7d} <span className="text-xs text-gray-400 font-medium">user/hari</span></p>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">This Week</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black tabular-nums text-gray-900">{data?.wow?.current ?? 0}</p>
              {typeof wowDelta === "number" && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${wowDelta >= 0 ? "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : "text-red-500 bg-red-50 px-1.5 py-0.5 rounded"}`}>
                  {wowDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {wowDelta >= 0 ? "+" : ""}{wowDelta}% WoW
                </span>
              )}
            </div>
          </div>
          <div className="h-10 w-px bg-gray-100 hidden sm:block" />
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Approval 30d</p>
            <p className="text-2xl font-black tabular-nums text-gray-900">{approvalPct}%</p>
          </div>
          <div className="h-10 w-px bg-gray-100 hidden lg:block" />
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Peak Hour</p>
            <p className="text-2xl font-black tabular-nums text-gray-900">
              {data?.peakHour ? `${String(data.peakHour.hour).padStart(2,"0")}:00` : "—"}
            </p>
          </div>
        </div>
        <Link href="/developer/analytics"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md">
          Deep Analytics <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Stat Cards with Sparklines ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch">
        <StatCard label="Total Users"  value={pt?.totalUsers}   icon={Users}      loading={loading} bgClass="bg-blue-50/40"
          spark={data?.sparklines?.users} delta={wowDelta} accent="#1e3a8a" color="text-blue-900" />
        <StatCard label="Active"       value={pt?.activeUsers}  icon={Activity}   color="text-emerald-700" accent="#047857" loading={loading} bgClass="bg-emerald-50/40" />
        <StatCard label="Pending"      value={pt?.pendingUsers} icon={Clock}      color="text-amber-700"   accent="#b45309" loading={loading} href="/developer/pending" bgClass="bg-amber-50/40" />
        <StatCard label="Agents"       value={pt?.activeAgents} icon={Users}      color="text-indigo-700"  accent="#4338ca" loading={loading} bgClass="bg-indigo-50/40"
          spark={data?.sparklines?.agents} />
        <StatCard label="Agencies"     value={pt?.agencies}     icon={Briefcase}  color="text-fuchsia-700" accent="#a21caf" loading={loading} href="/developer/agencies" bgClass="bg-fuchsia-50/40"
          spark={data?.sparklines?.agencies} />
        <StatCard label="Hospitals"    value={pt?.hospitals}    icon={Building2}  color="text-teal-700"    accent="#0f766e" loading={loading} href="/developer/hospitals" bgClass="bg-teal-50/40"
          spark={data?.sparklines?.hospitals} />
      </div>

      {/* ── Smart Insights ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-gray-900">Smart Insights</h2>
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">AUTO</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.map((ins, i) => {
              const tone = ins.tone === "warn"
                ? "bg-amber-50 border-amber-100 text-amber-800"
                : ins.tone === "good"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
              const Icon = ins.tone === "warn" ? AlertTriangle : ins.tone === "good" ? CheckCircle2 : Activity
              return (
                <div key={i} className={`flex items-start gap-2.5 border rounded-xl px-3 py-2 ${tone}`}>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                  <p className="text-xs font-medium leading-relaxed">{ins.msg}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Daily Registrations — Bar Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Registrasi Pengguna</h2>
              <p className="text-xs text-gray-400 mt-0.5">30 hari terakhir</p>
            </div>
            {data && !loading && (
              <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                Total: {data.dailyRegistrations.reduce((s, d) => s + d.count, 0)}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.dailyRegistrations ?? []} barSize={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#f9fafb", radius: 4 }} />
                <Bar dataKey="count" fill="#1a56db" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Role Distribution — Donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-900">Distribusi Role</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pengguna aktif</p>
          </div>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : roleDonut.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Tidak ada data</div>
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={roleDonut} dataKey="count" nameKey="name" cx="50%" cy="50%"
                    innerRadius={38} outerRadius={60} paddingAngle={2}>
                    {roleDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined) => [value ?? 0, "Users"] as const}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {roleDonut.map(r => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.fill }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Registrations */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Registrasi Terbaru</h2>
              <p className="text-xs text-gray-400 mt-0.5">10 pendaftaran terakhir</p>
            </div>
            <Link href="/developer/users"
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors">
              Lihat semua <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : (data?.recentUsers ?? []).length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">Belum ada data</div>
            ) : (
              <div>
                {(data?.recentUsers ?? []).map((u) => {
                  const sc = STATUS_CFG[u.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.SUSPENDED
                  return (
                    <div key={u.user_id}
                      className="flex items-center gap-4 px-6 py-3 border-t border-gray-50 first:border-t-0 hover:bg-gray-50/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                        {(u.full_name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name ?? u.email}</p>
                        <p className="text-xs text-gray-400 truncate">{u.full_name ? u.email : fmtRole(u.role)}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                          <span className={`w-1 h-1 rounded-full ${sc.dot}`} />
                          {u.status}
                        </span>
                        <span className="text-[10px] text-gray-300 tabular-nums">{fmtRelative(u.created_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Claims Pipeline */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Pipeline Klaim</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pt?.totalClaims ?? "—"} total klaim
                </p>
              </div>
              <FileText className="h-4 w-4 text-gray-300" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-5 bg-gray-50 rounded animate-pulse" />)}
              </div>
            ) : (data?.claimsByStage ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada klaim</p>
            ) : (
              <div className="space-y-3">
                {(data?.claimsByStage ?? []).map(s => (
                  <StageBar key={s.stage} stage={s.stage} count={s.count} max={claimsMax} />
                ))}
              </div>
            )}
          </div>

          {/* Member Hierarchy Tree */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col items-stretch">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Member Hierarchy</h2>
                <p className="text-xs text-gray-400 mt-0.5">Korelasi distribusi pengguna</p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col justify-center">
              {loading ? (
                 <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
                 </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-gray-100 space-y-5 py-2">
                  
                  {/* Agency Node */}
                  <div className="relative">
                    <div className="absolute w-4 h-0.5 bg-gray-100 -left-4 top-4"></div>
                    <div className="absolute w-2 h-2 rounded-full bg-fuchsia-400 -left-[21px] top-3 border-2 border-white"></div>
                    <div className="flex items-center gap-3">
                      <div className="bg-fuchsia-50 p-2 rounded-lg">
                        <Briefcase className="h-4 w-4 text-fuchsia-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">Root Agencies</p>
                        <p className="text-[10px] text-gray-500">{pt?.agencies ?? 0} Instansi Terdaftar</p>
                      </div>
                    </div>
                  </div>

                  {/* Hospital/Admin Node */}
                  <div className="relative pl-6">
                    <div className="absolute w-6 h-0.5 bg-gray-100 left-0 top-4"></div>
                    <div className="absolute w-0.5 h-16 bg-gray-100 left-0 -top-12"></div>
                    <div className="absolute w-2 h-2 rounded-full bg-teal-400 -left-[3px] top-3 border-2 border-white"></div>
                    <div className="flex items-center gap-3">
                      <div className="bg-teal-50 p-2 rounded-lg">
                        <Building2 className="h-4 w-4 text-teal-600" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-gray-900">Hospital Admins</p>
                         <p className="text-[10px] text-gray-500">{pt?.hospitals ?? 0} Rumah Sakit Mitra</p>
                      </div>
                    </div>
                  </div>

                  {/* Agent Node */}
                  <div className="relative pl-12">
                     <div className="absolute w-6 h-0.5 bg-gray-100 left-6 top-4"></div>
                     <div className="absolute w-0.5 h-16 bg-gray-100 left-6 -top-12"></div>
                     <div className="absolute w-2 h-2 rounded-full bg-blue-400 left-[21px] top-3 border-2 border-white"></div>
                     <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">Active Agents</p>
                          <p className="text-[10px] text-gray-500">{pt?.totalAgents ?? 0} Agen Lapangan</p>
                        </div>
                     </div>
                  </div>

                   {/* End Users Node */}
                   <div className="relative pl-[4.5rem]">
                     <div className="absolute w-6 h-0.5 bg-gray-100 left-12 top-4"></div>
                     <div className="absolute w-0.5 h-16 bg-gray-100 left-12 -top-12"></div>
                     <div className="absolute w-2 h-2 rounded-full bg-amber-400 left-[45px] top-3 border-2 border-white shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                     <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Activity className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">End Users</p>
                            <p className="text-[10px] text-gray-500">{pt?.totalUsers ?? 0} Pasien / Klien</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-amber-700">{pt?.activeUsers ?? 0} Aktif</span>
                     </div>
                  </div>
                  
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/developer/pending",  label: "Review Pending",  icon: UserCheck,  color: "bg-amber-50  border-amber-200  text-amber-800  hover:bg-amber-100" },
          { href: "/developer/users",    label: "Kelola Users",    icon: Users,      color: "bg-blue-50   border-blue-200   text-blue-800   hover:bg-blue-100" },
          { href: "/developer/analytics",label: "Analytics",       icon: BarChart2,  color: "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100" },
          { href: "/developer/terminal", label: "Quick Create",    icon: TrendingUp, color: "bg-gray-50   border-gray-200   text-gray-800   hover:bg-gray-100" },
        ].map(({ href, label, icon: Icon, color }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 transition-all ${color}`}>
            <Icon className="h-5 w-5 shrink-0 opacity-70" />
            <span className="text-sm font-semibold">{label}</span>
            <ArrowRight className="h-4 w-4 ml-auto opacity-40" />
          </Link>
        ))}
      </div>

    </div>
  )
}
