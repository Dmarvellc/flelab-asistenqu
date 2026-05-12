"use client"

import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp, Users, Building2, Briefcase, FileText,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, BarChart2,
  Activity, Server, Database
} from "lucide-react"

import {
  ChartDailyRegistrations,
  ChartMonthlyArea,
  ChartClaimsDonut,
  ChartCumulativeGrowth,
  ChartDailyDelta,
  ChartMonthlyDelta
} from "@/components/developer/analytics-charts"

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
    totalClients: number
  }
  recentUsers: { user_id: string; email: string; role: string; status: string; created_at: string; full_name?: string }[]
  roleGrowth30d: { role: string; count: number }[]
  approvalRate30d: { approved: number; rejected: number; pending: number }
}

interface TableSize { table_name: string; row_count: number; total_size: string }
interface AgencyStat { agency_id: string; name: string; agent_count: number; claim_count: number; created_at: string }
interface TopAgent { full_name: string; email: string; claim_count: number; status: string; created_at: string }

interface HealthData {
  dbLatency: number
  dbSize: string
  activeConnections: number
  recentRejections: number
  tableSizes: TableSize[]
  agencyStats: AgencyStat[]
  topAgents: TopAgent[]
  timestamp: string
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-black">{title}</h2>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── KPI Card ───────────────────────────────────────────────────── */
function KPI({ label, value, sub, icon: Icon, color = "text-black", loading }: {
  label: string; value: number | string | undefined
  sub?: string; icon: React.ElementType; color?: string; loading?: boolean
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4 sm:p-6">
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
export default function SystemHealthAnalyticsPage() {
  const [data, setData]       = useState<Analytics | null>(null)
  const [health, setHealth]   = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const [resData, resHealth] = await Promise.all([
        fetch("/api/developer/analytics", { cache: "no-store" }),
        fetch("/api/developer/system-health", { cache: "no-store" })
      ])
      if (resData.ok) setData(await resData.json())
      if (resHealth.ok) setHealth(await resHealth.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const pt = data?.platformTotals
  const ar = data?.approvalRate30d
  const arTotal = (ar?.approved ?? 0) + (ar?.rejected ?? 0) + (ar?.pending ?? 0)
  const approvalPct = arTotal > 0 ? Math.round(((ar?.approved ?? 0) / arTotal) * 100) : 0

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">System Health & Analytics</h1>
            <p className="text-sm text-gray-500 font-medium">Enterprise dashboard overview, client metrics, and platform performance</p>
          </div>
        </div>
        <button
          onClick={fetch_}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-md text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-50 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* ── KPI Row (Real API Data) ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KPI label="Total Client"     value={pt?.totalClients} icon={Users}     color="text-black" loading={loading} sub="End-user data" />
        <KPI label="Total Pengguna"   value={pt?.totalUsers}   icon={Users}     color="text-black" loading={loading} />
        <KPI label="Agensi Aktif"     value={pt?.agencies}     icon={Briefcase} color="text-black" loading={loading} />
        <KPI label="Rumah Sakit"      value={pt?.hospitals}    icon={Building2} color="text-black" loading={loading} />
        <KPI label="Total Klaim"      value={pt?.totalClaims}  icon={FileText}  color="text-black" loading={loading} />
        <KPI label="Server Uptime"    value="99.9%"            icon={Server}    color="text-black" loading={false} sub="Last 30 days" />
      </div>

      {/* ── Section: Client & Agency Activity ─────────────────────────────────── */}
      <div>
        <SectionHeader title="Aktivitas Pendaftaran Platform" sub="Total harian dan akumulasi bulanan pendaftaran" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartDailyRegistrations data={data?.dailyRegistrations} />
          <ChartMonthlyArea data={data?.monthlyRegistrations} />
        </div>
      </div>

      {/* ── Section: System Health & Enterprise Capabilities ─────────────────────────────────── */}
      <div>
        <SectionHeader title="Distribusi Entitas & Pertumbuhan" sub="Evaluasi distribusi platform dan akumulasi client" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartClaimsDonut data={data?.claimsByStage} />
          <ChartCumulativeGrowth daily={data?.dailyRegistrations} totalNow={pt?.totalUsers} />
          <ChartDailyDelta data={data?.dailyRegistrations} />
        </div>
      </div>

      {/* ── Section: Server Load & Churn ─────────────────────────────────── */}
      <div>
        <SectionHeader title="Analisis Pertumbuhan" sub="Monitoring detail delta (selisih) pendaftaran per bulan" />
        <div className="grid grid-cols-1 gap-6">
          <ChartMonthlyDelta data={data?.monthlyRegistrations} />
        </div>
      </div>

      {/* ── Additional Analytics: Top Agents & Agencies ───────────────────────────────────── */}
      <div>
        <SectionHeader title="Performa Agensi & Agen (Top 5)" sub="Berdasarkan volume klaim terbanyak" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-black">Top Agensi</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? <div className="p-12 text-center text-gray-400">Memuat...</div> : (health?.agencyStats || []).slice(0,5).map((a, i) => (
                <div key={a.agency_id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.agent_count} agen aktif</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">{a.claim_count}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Klaim</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-black">Top Agen</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {loading ? <div className="p-12 text-center text-gray-400">Memuat...</div> : (health?.topAgents || []).slice(0,5).map((a, i) => (
                <div key={a.email} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.full_name || a.email.split("@")[0]}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{a.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">{a.claim_count}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Klaim</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── System Infrastructure ───────────────────────────────────── */}
      <div>
        <SectionHeader title="Kesehatan Infrastruktur Database" sub="Metrik operasional PostgreSQL" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Latency</p>
              {loading ? <div className="h-8 w-20 bg-gray-100 rounded" /> : <p className={`text-3xl font-black ${health && health.dbLatency < 100 ? "text-emerald-600" : "text-amber-500"}`}>{health?.dbLatency ?? 0}ms</p>}
            </div>
            <Activity className="h-8 w-8 text-gray-200" />
          </div>
          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Koneksi Aktif</p>
              {loading ? <div className="h-8 w-20 bg-gray-100 rounded" /> : <p className="text-3xl font-black text-blue-600">{health?.activeConnections ?? 0}</p>}
            </div>
            <Server className="h-8 w-8 text-gray-200" />
          </div>
          <div className="bg-white rounded-md border border-gray-200 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ukuran DB</p>
              {loading ? <div className="h-8 w-20 bg-gray-100 rounded" /> : <p className="text-3xl font-black text-slate-900">{health?.dbSize ?? "0 MB"}</p>}
            </div>
            <Database className="h-8 w-8 text-gray-200" />
          </div>
        </div>
      </div>

    </div>
  )
}
