"use client"

import { useEffect, useState, useCallback } from "react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend,
} from "recharts"
import {
  TrendingUp, Users, Building2, Briefcase, FileText,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, BarChart2,
} from "lucide-react"

/* ─── Types ──────────────────────────────────────────────────────── */
interface Analytics {
  dailyRegistrations:  { date: string; count: number }[]
  monthlyRegistrations: { month: string; count: number }[]
  claimsByStage:       { stage: string; count: number }[]
  roleStats:           Record<string, number>
  usersByStatus:       Record<string, number>
  platformTotals: {
    agencies: number; hospitals: number
    activeAgents: number; totalAgents: number
    totalClaims: number; totalUsers: number
    activeUsers: number; pendingUsers: number
  }
  recentUsers: { user_id: string; email: string; role: string; status: string; created_at: string; full_name?: string }[]
  roleGrowth30d: { role: string; count: number }[]
  approvalRate30d: { approved: number; rejected: number; pending: number }
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const ROLE_COLORS: Record<string, string> = {
  agent:           "#1a56db",
  admin_agency:    "#7c3aed",
  hospital_admin:  "#059669",
  insurance_admin: "#d97706",
  developer:       "#111827",
  super_admin:     "#6b7280",
}
const DEFAULT_COLOR = "#9ca3af"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "#10b981",
  PENDING:   "#f59e0b",
  REJECTED:  "#ef4444",
  SUSPENDED: "#6b7280",
}

const STAGE_LABELS: Record<string, string> = {
  DRAFT_AGENT:    "Draft",
  PENDING_LOG:    "Pending Log",
  LOG_ISSUED:     "Log Issued",
  PENDING_REVIEW: "Pending Review",
  APPROVED:       "Disetujui",
  REJECTED:       "Ditolak",
  COMPLETED:      "Selesai",
}

const STAGE_COLORS: Record<string, string> = {
  APPROVED: "#10b981", COMPLETED: "#059669",
  REJECTED: "#ef4444",
  PENDING_LOG: "#f59e0b", PENDING_REVIEW: "#d97706",
  DRAFT_AGENT: "#d1d5db", LOG_ISSUED: "#3b82f6",
}

function fmtRole(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

/* ─── Tooltip Components ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, unit = "" }: {
  active?: boolean; payload?: { value: number; name?: string; fill?: string }[]; label?: string; unit?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-gray-900">
          {p.value} {unit}
        </p>
      ))}
    </div>
  )
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────── */
function KPI({ label, value, sub, icon: Icon, color = "text-gray-900", loading }: {
  label: string; value: number | string | undefined
  sub?: string; icon: React.ElementType; color?: string; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      {loading
        ? <div className="h-10 w-24 bg-gray-100 animate-pulse rounded-lg" />
        : <p className={`text-4xl font-black tracking-tight leading-none ${color}`}>{value ?? "—"}</p>
      }
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/developer/analytics", { cache: "no-store" })
      if (r.ok) setData(await r.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const pt = data?.platformTotals
  const ar = data?.approvalRate30d
  const arTotal = (ar?.approved ?? 0) + (ar?.rejected ?? 0) + (ar?.pending ?? 0)
  const approvalPct = arTotal > 0 ? Math.round(((ar?.approved ?? 0) / arTotal) * 100) : 0

  const roleDonut = Object.entries(data?.roleStats ?? {}).map(([role, count]) => ({
    name: fmtRole(role), count, fill: ROLE_COLORS[role] ?? DEFAULT_COLOR,
  }))

  const statusDonut = Object.entries(data?.usersByStatus ?? {}).map(([status, count]) => ({
    name: status, count, fill: STATUS_COLORS[status] ?? DEFAULT_COLOR,
  }))

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-400">Platform overview & growth metrics</p>
          </div>
        </div>
        <button
          onClick={fetch_}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPI label="Total Pengguna"   value={pt?.totalUsers}   icon={Users}     loading={loading} />
        <KPI label="Pengguna Aktif"   value={pt?.activeUsers}  icon={Users}     color="text-emerald-600" loading={loading} sub={`${pt?.totalUsers ? Math.round((pt.activeUsers / pt.totalUsers) * 100) : 0}% dari total`} />
        <KPI label="Agensi"           value={pt?.agencies}     icon={Briefcase} color="text-violet-600" loading={loading} />
        <KPI label="Rumah Sakit"      value={pt?.hospitals}    icon={Building2} color="text-teal-600" loading={loading} />
        <KPI label="Total Klaim"      value={pt?.totalClaims}  icon={FileText}  color="text-blue-600" loading={loading} />
      </div>

      {/* ── Monthly Growth Trend ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <SectionHeader title="Pertumbuhan Pengguna" sub="12 bulan terakhir" />
        {loading ? (
          <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.monthlyRegistrations ?? []} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1a56db" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1a56db" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit="registrasi" />} />
              <Area dataKey="count" stroke="#1a56db" strokeWidth={2} fill="url(#grad)" dot={{ fill: "#1a56db", r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Middle Row: Role + Status Donuts ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Role Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <SectionHeader title="Distribusi Role (Aktif)" sub="Breakdown pengguna berdasarkan role" />
          {loading ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-col gap-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={roleDonut} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {roleDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined) => [value ?? 0, "Users"] as const}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {roleDonut.map(r => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{r.name}</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <SectionHeader title="Status Pengguna" sub="Semua pengguna per status" />
          {loading ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-col gap-5">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusDonut} dataKey="count" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {statusDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined) => [value ?? 0, "Users"] as const}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {statusDonut.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
                    <span className="text-xs text-gray-600 flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Claims by Stage ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <SectionHeader
          title="Pipeline Klaim"
          sub={`${pt?.totalClaims ?? "—"} total klaim — distribusi per stage`}
        />
        {loading ? (
          <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
        ) : (data?.claimsByStage ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Belum ada data klaim</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={(data?.claimsByStage ?? []).map(s => ({
                ...s,
                label: STAGE_LABELS[s.stage] ?? s.stage.replace(/_/g, " "),
                fill: STAGE_COLORS[s.stage] ?? "#d1d5db",
              }))}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
              barSize={12}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip unit="klaim" />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(data?.claimsByStage ?? []).map((s, i) => (
                  <Cell key={i} fill={STAGE_COLORS[s.stage] ?? "#d1d5db"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Approval Rate (30d) ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <SectionHeader title="Approval Rate — 30 Hari Terakhir" sub="Persetujuan registrasi pengguna baru" />
          {loading ? (
            <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div>
              <div className="flex items-end gap-4 mb-5">
                <span className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none ${approvalPct >= 80 ? "text-emerald-600" : approvalPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {approvalPct}%
                </span>
                <p className="text-sm text-gray-400 mb-2">tingkat persetujuan</p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${approvalPct >= 80 ? "bg-emerald-400" : approvalPct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${approvalPct}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { label: "Disetujui", count: ar?.approved, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Ditolak",   count: ar?.rejected, icon: XCircle,      color: "text-red-600",     bg: "bg-red-50"     },
                  { label: "Pending",   count: ar?.pending,  icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-50"   },
                ].map(({ label, count, icon: Icon, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                    <Icon className={`h-5 w-5 ${color} mx-auto mb-2`} />
                    <p className="text-2xl font-black text-gray-900">{count ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Role Growth 30d */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <SectionHeader title="Pertumbuhan per Role" sub="30 hari terakhir" />
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-50 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.roleGrowth30d ?? []).map(r => {
                const max = Math.max(...(data?.roleGrowth30d ?? []).map(x => x.count), 1)
                return (
                  <div key={r.role} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ROLE_COLORS[r.role] ?? DEFAULT_COLOR }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{fmtRole(r.role)}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(r.count / max) * 100}%`, background: ROLE_COLORS[r.role] ?? DEFAULT_COLOR }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-900 tabular-nums w-5 text-right">{r.count}</span>
                  </div>
                )
              })}
              {(data?.roleGrowth30d ?? []).length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Tidak ada registrasi baru</p>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
