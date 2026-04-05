"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Briefcase, Search, RefreshCw, ChevronLeft, ChevronRight,
    Users, FileText, CheckCircle2, Building2, ArrowUpDown, ExternalLink,
    TrendingUp, Plus,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Agency {
    agency_id: string;
    name: string;
    address: string | null;
    created_at: string;
    active_agents: number;
    total_agents: number;
    admins: number;
    total_claims: number;
    approved_claims: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function approvalRate(approved: number, total: number) {
    if (total === 0) return 0;
    return Math.round((approved / total) * 100);
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState<"name" | "active_agents" | "total_claims" | "created_at">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const fetchAgencies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: "agencies",
                page: page.toString(),
                limit: "15",
                search,
            });
            const res = await fetch(`/api/developer/entities?${params}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                // Client-side sort
                const sorted = [...(data.data ?? [])].sort((a, b) => {
                    const av = a[sortBy] ?? 0;
                    const bv = b[sortBy] ?? 0;
                    if (typeof av === "string") {
                        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                    }
                    return sortOrder === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
                });
                setAgencies(sorted);
                setTotalPages(data.meta.totalPages);
                setTotal(data.meta.total);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, [page, search, sortBy, sortOrder]);

    useEffect(() => {
        const t = setTimeout(fetchAgencies, 400);
        return () => clearTimeout(t);
    }, [fetchAgencies]);

    const toggleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

    const SortIcon = ({ col }: { col: typeof sortBy }) => (
        <ArrowUpDown className={`h-3 w-3 inline ml-1 transition-opacity ${sortBy === col ? "opacity-100 text-gray-900" : "opacity-30"}`} />
    );

    /* Summary stats */
    const totalAgents = agencies.reduce((s, a) => s + Number(a.active_agents), 0);
    const totalClaims = agencies.reduce((s, a) => s + Number(a.total_claims), 0);

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center shadow-md">
                        <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Agencies</h1>
                        <p className="text-sm text-gray-400">{total} agencies registered on platform</p>
                    </div>
                </div>
                <Link
                    href="/developer/add-agency"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Agency
                </Link>
            </div>

            {/* ── Summary Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Agencies", value: total, icon: Briefcase, color: "text-violet-600" },
                    { label: "Active Agents", value: totalAgents, icon: Users, color: "text-blue-600" },
                    { label: "Total Claims", value: totalClaims, icon: FileText, color: "text-emerald-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        {loading
                            ? <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
                            : <p className={`text-3xl font-black tracking-tight ${color}`}>{value.toLocaleString()}</p>
                        }
                    </div>
                ))}
            </div>

            {/* ── Search & Controls ────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search agencies…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                    />
                </div>
                <button
                    onClick={() => { setLoading(true); fetchAgencies(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* ── Data Table ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th
                                    className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("name")}
                                >
                                    Agency <SortIcon col="name" />
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("active_agents")}
                                >
                                    Agents <SortIcon col="active_agents" />
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("total_claims")}
                                >
                                    Claims <SortIcon col="total_claims" />
                                </th>
                                <th className="text-center px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Approval Rate
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("created_at")}
                                >
                                    Joined <SortIcon col="created_at" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-100 rounded animate-pulse" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse mx-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                    </tr>
                                ))
                            ) : agencies.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {search ? `No agencies matching "${search}"` : "No agencies found"}
                                    </td>
                                </tr>
                            ) : (
                                agencies.map(agency => {
                                    const rate = approvalRate(Number(agency.approved_claims), Number(agency.total_claims));
                                    return (
                                        <tr key={agency.agency_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 text-sm font-black text-violet-600">
                                                        {agency.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{agency.name}</p>
                                                        {agency.address && (
                                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{agency.address}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="font-bold text-gray-900 tabular-nums">{Number(agency.active_agents).toLocaleString()}</span>
                                                    <span className="text-xs text-gray-400">{Number(agency.total_agents)} total</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-900 tabular-nums">{Number(agency.total_claims).toLocaleString()}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className={`text-xs font-bold ${rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-gray-400"}`}>
                                                        {Number(agency.total_claims) > 0 ? `${rate}%` : "—"}
                                                    </span>
                                                    {Number(agency.total_claims) > 0 && (
                                                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-400" : rate >= 50 ? "bg-amber-400" : "bg-gray-300"}`}
                                                                style={{ width: `${rate}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs text-gray-500">{fmtDate(agency.created_at)}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            Page {page} of {totalPages} · {total} agencies
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
                            >
                                <ChevronLeft className="h-3 w-3" /> Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
                            >
                                Next <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
