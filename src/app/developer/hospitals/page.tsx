"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Building2, Search, RefreshCw, ChevronLeft, ChevronRight,
    Users, FileText, ArrowUpDown, Activity,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
interface Hospital {
    hospital_id: string;
    name: string;
    address: string | null;
    created_at: string;
    admin_count: number;
    patient_requests: number;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function HospitalsPage() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState<"name" | "admin_count" | "patient_requests" | "created_at">("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const fetchHospitals = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: "hospitals",
                page: page.toString(),
                limit: "15",
                search,
            });
            const res = await fetch(`/api/developer/entities?${params}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const sorted = [...(data.data ?? [])].sort((a, b) => {
                    const av = a[sortBy] ?? 0;
                    const bv = b[sortBy] ?? 0;
                    if (typeof av === "string") {
                        return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                    }
                    return sortOrder === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
                });
                setHospitals(sorted);
                setTotalPages(data.meta.totalPages);
                setTotal(data.meta.total);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, [page, search, sortBy, sortOrder]);

    useEffect(() => {
        const t = setTimeout(fetchHospitals, 400);
        return () => clearTimeout(t);
    }, [fetchHospitals]);

    const toggleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

    const SortIcon = ({ col }: { col: typeof sortBy }) => (
        <ArrowUpDown className={`h-3 w-3 inline ml-1 transition-opacity ${sortBy === col ? "opacity-100 text-gray-900" : "opacity-30"}`} />
    );

    const totalAdmins = hospitals.reduce((s, h) => s + Number(h.admin_count), 0);
    const totalRequests = hospitals.reduce((s, h) => s + Number(h.patient_requests), 0);

    return (
        <div className="space-y-6">

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Hospitals</h1>
                        <p className="text-xs sm:text-sm text-gray-400 truncate">{total} hospitals registered on platform</p>
                    </div>
                </div>
            </div>

            {/* ── Summary Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                    { label: "Total Hospitals", value: total, icon: Building2, color: "text-teal-600" },
                    { label: "Hospital Admins", value: totalAdmins, icon: Users, color: "text-blue-600" },
                    { label: "Patient Requests", value: totalRequests, icon: Activity, color: "text-violet-600" },
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
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search hospitals…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                    />
                </div>
                <button
                    onClick={() => { setLoading(true); fetchHospitals(); }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-all shrink-0"
                    aria-label="Refresh"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Refresh</span>
                </button>
            </div>

            {/* ── Data Table ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th
                                    className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("name")}
                                >
                                    Hospital <SortIcon col="name" />
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("admin_count")}
                                >
                                    Admins <SortIcon col="admin_count" />
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("patient_requests")}
                                >
                                    Patient Requests <SortIcon col="patient_requests" />
                                </th>
                                <th
                                    className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => toggleSort("created_at")}
                                >
                                    Registered <SortIcon col="created_at" />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-6 py-4"><div className="h-4 w-48 bg-gray-100 rounded animate-pulse" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                    </tr>
                                ))
                            ) : hospitals.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {search ? `No hospitals matching "${search}"` : "No hospitals found"}
                                    </td>
                                </tr>
                            ) : (
                                hospitals.map(hospital => (
                                    <tr key={hospital.hospital_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 text-sm font-black text-teal-600">
                                                    {hospital.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{hospital.name}</p>
                                                    {hospital.address && (
                                                        <p className="text-xs text-gray-400 truncate max-w-[240px]">{hospital.address}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-gray-900 tabular-nums">{Number(hospital.admin_count)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-gray-900 tabular-nums">{Number(hospital.patient_requests).toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs text-gray-500">{fmtDate(hospital.created_at)}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            Page {page} of {totalPages} · {total} hospitals
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
