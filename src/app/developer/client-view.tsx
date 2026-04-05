"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Activity, Clock, Building2, Briefcase, FileText,
  ArrowRight, RefreshCw, TrendingUp, UserCheck,
  CheckCircle2, XCircle, AlertTriangle, ChevronRight, BarChart2,
} from "lucide-react";

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
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

/* ─── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color = "text-gray-900",
  sub, loading, href,
}: {
  label: string; value: number | string | undefined
  icon: React.ElementType; color?: string
  sub?: string; loading?: boolean; href?: string
}) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex flex-col gap-3 ${href ? "hover:border-gray-200 hover:shadow-md transition-all" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      {loading
        ? <div className="h-9 w-20 bg-gray-100 animate-pulse rounded-lg" />
        : <p className={`text-4xl font-black tracking-tight leading-none ${color}`}>{value ?? "—"}</p>
      }
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

/* ─── Custom Bar Tooltip ─────────────────────────────────────────── */
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

/* ─── Page ───────────────────────────────────────────────────────── */
export function DeveloperClientView() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

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

  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Developer Console</h1>
            <span className="inline-flex items-center gap-1 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Production
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {lastUpdate ? `Diperbarui ${fmtRelative(lastUpdate.toISOString())}` : "Memuat data…"}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAnalytics() }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users"  value={pt?.totalUsers}   icon={Users}      loading={loading} />
        <StatCard label="Active"       value={pt?.activeUsers}  icon={Activity}   color="text-emerald-600" loading={loading} />
        <StatCard label="Pending"      value={pt?.pendingUsers} icon={Clock}      color="text-amber-600"   loading={loading} href="/developer/pending" />
        <StatCard label="Agents"       value={pt?.activeAgents} icon={Users}      color="text-blue-600"    loading={loading} />
        <StatCard label="Agencies"     value={pt?.agencies}     icon={Briefcase}  color="text-violet-600"  loading={loading} />
        <StatCard label="Hospitals"    value={pt?.hospitals}    icon={Building2}  color="text-teal-600"    loading={loading} />
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
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={24}
                />
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
                {(data?.recentUsers ?? []).map((u, i) => {
                  const sc = STATUS_CFG[u.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.SUSPENDED
                  return (
                    <div key={u.user_id}
                      className="flex items-center gap-4 px-6 py-3 border-t border-gray-50 first:border-t-0 hover:bg-gray-50/50 transition-colors">
                      {/* Avatar */}
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

          {/* Approval Rate Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Approval Rate</h2>
                <p className="text-xs text-gray-400 mt-0.5">30 hari terakhir</p>
              </div>
              <span className={`text-lg font-black ${approvalPct >= 80 ? "text-emerald-600" : approvalPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                {loading ? "—" : `${approvalPct}%`}
              </span>
            </div>
            {loading ? (
              <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
            ) : (
              <>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${approvalPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Approved", count: ar?.approved, icon: CheckCircle2, color: "text-emerald-600" },
                    { label: "Rejected", count: ar?.rejected, icon: XCircle,     color: "text-red-500"     },
                    { label: "Pending",  count: ar?.pending,  icon: AlertTriangle,color: "text-amber-600"  },
                  ].map(({ label, count, icon: Icon, color }) => (
                    <div key={label} className="text-center">
                      <Icon className={`h-4 w-4 ${color} mx-auto mb-1`} />
                      <p className="text-sm font-black text-gray-900">{count ?? 0}</p>
                      <p className="text-[10px] text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
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
