"use client";

import { useEffect, useState, useCallback } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    LineChart, Line,
} from "recharts";
import {
    Database, Zap, Server, Activity, RefreshCw, AlertTriangle,
    TrendingUp, Users, FileText, Building2, Briefcase, ChevronUp, ChevronDown,
    Minus, Clock, HardDrive, Wifi,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
interface TableSize { table_name: string; row_count: number; total_size: string }
interface GrowthPoint { day: string; count: number }
interface AgencyStat { agency_id: string; name: string; agent_count: number; claim_count: number; created_at: string }
interface HospitalStat { hospital_id: string; name: string; admin_count: number; created_at: string }
interface TopAgent { full_name: string; email: string; claim_count: number; status: string; created_at: string }

interface HealthData {
    dbLatency: number
    dbSize: string
    activeConnections: number
    recentRejections: number
    tableSizes: TableSize[]
    userGrowth7d: GrowthPoint[]
    claimsGrowth7d: GrowthPoint[]
    agencyStats: AgencyStat[]
    hospitalStats: HospitalStat[]
    topAgents: TopAgent[]
    timestamp: string
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function fmtRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m}m lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}j lalu`;
    return `${Math.floor(h / 24)}h lalu`;
}

function latencyColor(ms: number) {
    if (ms < 50) return "text-emerald-600";
    if (ms < 150) return "text-amber-600";
    return "text-red-600";
}

function latencyBg(ms: number) {
    if (ms < 50) return "bg-emerald-50 border-emerald-200";
    if (ms < 150) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
}

function latencyLabel(ms: number) {
    if (ms < 50) return "Excellent";
    if (ms < 150) return "Good";
    return "Slow";
}

/* ─── Metric Card ────────────────────────────────────────────────── */
function MetricCard({
    label, value, sub, icon: Icon, color = "text-gray-900", bg = "bg-white", loading,
}: {
    label: string; value: string | number | undefined; sub?: string
    icon: React.ElementType; color?: string; bg?: string; loading?: boolean
}) {
    return (
        <div className={`${bg} rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
            </div>
            {loading
                ? <div className="h-8 w-20 bg-gray-100 animate-pulse rounded-lg" />
                : <p className={`text-3xl font-black tracking-tight leading-none ${color}`}>{value ?? "—"}</p>
            }
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
    );
}

/* ─── Mini Tooltip ───────────────────────────────────────────────── */
function MiniTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-3 py-2 text-xs">
            <p className="text-gray-400 mb-0.5">{label}</p>
            <p className="font-bold text-gray-900">{payload[0].value}</p>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function SystemHealthPage() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/developer/system-health", { cache: "no-store" });
            if (res.ok) {
                setData(await res.json());
                setLastUpdate(new Date());
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    /* Normalize growth data to fill missing days */
    const normalizeGrowth = (data: GrowthPoint[]) =>
        data.map(d => ({ ...d, day: fmtDate(d.day) }));

    const userGrowth = normalizeGrowth(data?.userGrowth7d ?? []);
    const claimsGrowth = normalizeGrowth(data?.claimsGrowth7d ?? []);

    return (
        <div className="space-y-8">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center shadow-md">
                        <Server className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">System Health</h1>
                        <p className="text-sm text-gray-400">
                            {lastUpdate ? `Updated ${fmtRelative(lastUpdate.toISOString())}` : "Loading…"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setLoading(true); fetchHealth(); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Status Banner ────────────────────────────────────── */}
            {!loading && data && (
                <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${data.dbLatency < 150
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-amber-50 border-amber-200"
                    }`}>
                    <div className={`w-3 h-3 rounded-full ${data.dbLatency < 150 ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${data.dbLatency < 150 ? "text-emerald-800" : "text-amber-800"}`}>
                            {data.dbLatency < 150 ? "All Systems Operational" : "Elevated Latency Detected"}
                        </p>
                        <p className={`text-xs mt-0.5 ${data.dbLatency < 150 ? "text-emerald-600" : "text-amber-600"}`}>
                            Database responding in {data.dbLatency}ms · {data.activeConnections} active connections
                        </p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${data.dbLatency < 50
                        ? "bg-emerald-100 text-emerald-700"
                        : data.dbLatency < 150
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                        {latencyLabel(data.dbLatency)}
                    </span>
                </div>
            )}

            {/* ── Metric Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="DB Latency"
                    value={data ? `${data.dbLatency}ms` : undefined}
                    icon={Zap}
                    color={data ? latencyColor(data.dbLatency) : "text-gray-400"}
                    sub={data ? latencyLabel(data.dbLatency) : undefined}
                    loading={loading}
                />
                <MetricCard
                    label="DB Size"
                    value={data?.dbSize}
                    icon={HardDrive}
                    color="text-blue-600"
                    sub="Total database size"
                    loading={loading}
                />
                <MetricCard
                    label="Active Connections"
                    value={data?.activeConnections}
                    icon={Wifi}
                    color="text-violet-600"
                    sub="PostgreSQL connections"
                    loading={loading}
                />
                <MetricCard
                    label="Rejections (24h)"
                    value={data?.recentRejections}
                    icon={AlertTriangle}
                    color={data && data.recentRejections > 0 ? "text-amber-600" : "text-gray-400"}
                    sub="Recent user rejections"
                    loading={loading}
                />
            </div>

            {/* ── Growth Charts ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* User Growth 7d */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">User Registrations</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
                        </div>
                        <Users className="h-4 w-4 text-gray-300" />
                    </div>
                    {loading ? (
                        <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
                    ) : userGrowth.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={userGrowth} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                                <Tooltip content={<MiniTooltip />} cursor={{ fill: "#f9fafb", radius: 4 }} />
                                <Bar dataKey="count" fill="#1a56db" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Claims Growth 7d */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Claims Activity</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
                        </div>
                        <FileText className="h-4 w-4 text-gray-300" />
                    </div>
                    {loading ? (
                        <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
                    ) : claimsGrowth.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-sm text-gray-400">No claims data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={claimsGrowth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                                <Tooltip content={<MiniTooltip />} />
                                <Line dataKey="count" stroke="#059669" strokeWidth={2} dot={{ fill: "#059669", r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Database Tables ───────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">Database Tables</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Row counts & storage usage</p>
                    </div>
                    <Database className="h-4 w-4 text-gray-300" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                        <thead>
                            <tr className="border-b border-gray-50 bg-gray-50/40">
                                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Table</th>
                                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rows</th>
                                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Distribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-6 py-3"><div className="h-4 w-32 bg-gray-100 rounded animate-pulse" /></td>
                                        <td className="px-6 py-3 text-right"><div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-3 text-right"><div className="h-4 w-16 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-3"><div className="h-2 w-full bg-gray-100 rounded animate-pulse" /></td>
                                    </tr>
                                ))
                            ) : (
                                (() => {
                                    const maxRows = Math.max(...(data?.tableSizes ?? []).map(t => Number(t.row_count)), 1);
                                    return (data?.tableSizes ?? []).map((t, i) => {
                                        const pct = Math.round((Number(t.row_count) / maxRows) * 100);
                                        return (
                                            <tr key={t.table_name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                                        <span className="font-mono text-xs font-semibold text-gray-700">{t.table_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="text-xs font-bold text-gray-900 tabular-nums">
                                                        {Number(t.row_count).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className="text-xs text-gray-500 font-mono">{t.total_size}</span>
                                                </td>
                                                <td className="px-6 py-3 w-48">
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-400 rounded-full transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Bottom Row: Top Agents + Agencies ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Agents */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                        <h2 className="text-sm font-bold text-gray-900">Top Agents by Claims</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Most active agents on platform</p>
                    </div>
                    <div>
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (data?.topAgents ?? []).length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-400">No agent data</div>
                        ) : (
                            (data?.topAgents ?? []).map((agent, i) => (
                                <div key={agent.email} className="flex items-center gap-4 px-6 py-3 border-t border-gray-50 first:border-t-0 hover:bg-gray-50/50 transition-colors">
                                    <span className="text-xs font-black text-gray-300 w-5 tabular-nums">{i + 1}</span>
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                                        {(agent.full_name ?? agent.email)[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{agent.full_name ?? agent.email}</p>
                                        <p className="text-xs text-gray-400 truncate">{agent.full_name ? agent.email : "—"}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-gray-900 tabular-nums">{agent.claim_count}</span>
                                        <span className="text-xs text-gray-400">claims</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Agency Overview */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                        <h2 className="text-sm font-bold text-gray-900">Agency Overview</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Top agencies by agent count</p>
                    </div>
                    <div>
                        {loading ? (
                            <div className="p-6 space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : (data?.agencyStats ?? []).length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-400">No agency data</div>
                        ) : (
                            (data?.agencyStats ?? []).map((agency, i) => (
                                <div key={agency.agency_id} className="flex items-center gap-4 px-6 py-3 border-t border-gray-50 first:border-t-0 hover:bg-gray-50/50 transition-colors">
                                    <span className="text-xs font-black text-gray-300 w-5 tabular-nums">{i + 1}</span>
                                    <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center shrink-0 text-xs font-bold text-violet-600">
                                        {agency.name[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{agency.name}</p>
                                        <p className="text-xs text-gray-400">{agency.claim_count} claims</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Users className="h-3 w-3 text-gray-300" />
                                        <span className="text-xs font-bold text-gray-900 tabular-nums">{agency.agent_count}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
