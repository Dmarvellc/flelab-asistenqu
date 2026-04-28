"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Building2, Search, RefreshCw, ChevronLeft, ChevronRight,
    Users, Activity, ChevronsUpDown, ChevronUp, ChevronDown, X, Copy, Check, Trash2, Loader2,
    Mail, Phone, Stethoscope, CalendarClock, FileText, AlertTriangle, ShieldAlert,
} from "lucide-react";

interface Hospital {
    hospital_id: string;
    name: string;
    address: string | null;
    created_at: string;
    admin_count: number;
    patient_requests: number;
}

interface HospitalAdmin {
    user_role_id: string;
    user_id: string;
    email: string;
    role: string;
    full_name: string | null;
    phone_number: string | null;
    status: string;
    created_at: string;
}

interface HospitalImpact {
    admins: number;
    claims: number;
    patient_requests: number;
    appointments: number;
    doctors: number;
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function relDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m}m lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}j lalu`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}h lalu`;
    return fmtDate(iso);
}

type SortCol = "name" | "admin_count" | "patient_requests" | "created_at";

function SortTh({ label, col, sortBy, sortOrder, onToggle, className = "" }: {
    label: string; col: SortCol; sortBy: SortCol; sortOrder: "asc" | "desc";
    onToggle: (col: SortCol) => void; className?: string;
}) {
    const active = sortBy === col;
    return (
        <th
            onClick={() => onToggle(col)}
            className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? "text-gray-800" : "text-gray-400 hover:text-gray-600"} ${className}`}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {active ? (
                    sortOrder === "asc"
                        ? <ChevronUp className="h-3 w-3" />
                        : <ChevronDown className="h-3 w-3" />
                ) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
            </span>
        </th>
    );
}

function CopyIdButton({ id }: { id: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            title="Salin ID"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
            {copied
                ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                : <Copy className="h-3.5 w-3.5 text-gray-400" />}
        </button>
    );
}

function ImpactStat({ icon: Icon, label, value, tone }: {
    icon: typeof Users; label: string; value: number;
    tone: "neutral" | "warn" | "danger";
}) {
    const color = tone === "danger"
        ? "text-red-600"
        : tone === "warn"
            ? "text-amber-600"
            : "text-gray-700";
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</span>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <p className={`mt-1 text-xl font-black tracking-tight ${color}`}>{value.toLocaleString()}</p>
        </div>
    );
}

export default function HospitalsPage() {
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState<SortCol>("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const searchRef = useRef<HTMLInputElement>(null);

    // Detail / delete modal state
    const [openTarget, setOpenTarget] = useState<Hospital | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailAdmins, setDetailAdmins] = useState<HospitalAdmin[]>([]);
    const [detailImpact, setDetailImpact] = useState<HospitalImpact | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [confirmText, setConfirmText] = useState("");

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
                    if (typeof av === "string") return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
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

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    const openHospital = useCallback(async (hospital: Hospital) => {
        setOpenTarget(hospital);
        setDetailLoading(true);
        setDetailError(null);
        setDetailAdmins([]);
        setDetailImpact(null);
        setConfirmText("");
        try {
            const res = await fetch(`/api/developer/hospitals/${hospital.hospital_id}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setDetailError(data?.error || "Gagal memuat detail rumah sakit.");
                return;
            }
            setDetailAdmins(data.admins ?? []);
            setDetailImpact(data.impact ?? null);
        } catch {
            setDetailError("Gagal menghubungi server. Coba lagi.");
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const closeDetail = () => {
        if (deleteBusy) return;
        setOpenTarget(null);
        setDetailAdmins([]);
        setDetailImpact(null);
        setDetailError(null);
        setConfirmText("");
    };

    const handleDelete = async () => {
        if (!openTarget) return;
        setDeleteBusy(true);
        try {
            const res = await fetch(`/api/developer/hospitals/${openTarget.hospital_id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDetailError(data?.error || "Gagal menghapus rumah sakit.");
                return;
            }
            setOpenTarget(null);
            setDetailAdmins([]);
            setDetailImpact(null);
            setConfirmText("");
            fetchHospitals();
        } finally {
            setDeleteBusy(false);
        }
    };

    const toggleSort = (col: SortCol) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

    const allIds = hospitals.map(h => h.hospital_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const totalAdmins = hospitals.reduce((s, h) => s + Number(h.admin_count), 0);
    const totalRequests = hospitals.reduce((s, h) => s + Number(h.patient_requests), 0);

    const confirmPhrase = openTarget ? `HAPUS ${openTarget.name}`.slice(0, 64) : "";
    const confirmMatches = confirmText.trim().toUpperCase() === confirmPhrase.toUpperCase();

    return (
        <>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Hospitals</h1>
                        <p className="text-xs sm:text-sm text-gray-400">{total} rumah sakit terdaftar di platform</p>
                    </div>
                </div>

                {/* Summary Cards */}
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

                {/* Table Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* Toolbar */}
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {someSelected ? (
                                <span className="text-sm font-semibold text-gray-700 animate-in slide-in-from-left-2 fade-in duration-150">
                                    {selected.size} dipilih
                                </span>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-gray-900">Rumah Sakit</span>
                                    <span className="bg-gray-100 text-gray-500 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                                        {total}
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1.5 transition-all">
                                <button
                                    onClick={() => { if (searchOpen) { setSearchOpen(false); setSearch(""); setPage(1); } else setSearchOpen(true); }}
                                    className="p-0.5 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                                </button>
                                <div className={`overflow-hidden transition-all duration-200 ${searchOpen ? "w-44" : "w-0"}`}>
                                    <input
                                        ref={searchRef}
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                                        onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); setPage(1); } }}
                                        placeholder="Cari rumah sakit…"
                                        className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => { setLoading(true); fetchHospitals(); }}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/40">
                                    <th className="w-10 pl-5 py-3.5">
                                        <button
                                            onClick={toggleAll}
                                            className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-all ${
                                                allSelected || someSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-500"
                                            }`}
                                        >
                                            {allSelected ? (
                                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            ) : someSelected ? (
                                                <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
                                                    <path d="M1 1H7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                                </svg>
                                            ) : null}
                                        </button>
                                    </th>
                                    <SortTh label="Rumah Sakit" col="name" sortBy={sortBy} sortOrder={sortOrder} onToggle={toggleSort} className="text-left" />
                                    <SortTh label="Admins" col="admin_count" sortBy={sortBy} sortOrder={sortOrder} onToggle={toggleSort} className="text-right" />
                                    <SortTh label="Permintaan Data" col="patient_requests" sortBy={sortBy} sortOrder={sortOrder} onToggle={toggleSort} className="text-right" />
                                    <SortTh label="Terdaftar" col="created_at" sortBy={sortBy} sortOrder={sortOrder} onToggle={toggleSort} className="text-right" />
                                    <th className="w-20 pr-5 py-3.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className="w-10 pl-5 py-4">
                                                <div className="w-[15px] h-[15px] rounded-[3px] bg-gray-100 animate-pulse" />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-12 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="w-12 pr-5 py-4" />
                                        </tr>
                                    ))
                                ) : hospitals.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">
                                            {search ? `Tidak ada rumah sakit cocok dengan "${search}"` : "Belum ada rumah sakit"}
                                        </td>
                                    </tr>
                                ) : (
                                    hospitals.map(hospital => {
                                        const isSelected = selected.has(hospital.hospital_id);
                                        return (
                                            <tr
                                                key={hospital.hospital_id}
                                                className={`border-b border-gray-50 group/row transition-colors cursor-pointer ${isSelected ? "bg-gray-50/70" : "hover:bg-gray-50/50"}`}
                                                onClick={(e) => {
                                                    // ignore clicks from controls
                                                    if ((e.target as HTMLElement).closest("button")) return;
                                                    openHospital(hospital);
                                                }}
                                            >
                                                <td className="w-10 pl-5 py-4">
                                                    <button
                                                        onClick={() => toggleRow(hospital.hospital_id)}
                                                        className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-all ${
                                                            isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 opacity-0 group-hover/row:opacity-100 hover:border-gray-500"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{hospital.name}</p>
                                                        {hospital.address && (
                                                            <p className="text-xs text-gray-400 truncate max-w-[260px]">{hospital.address}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-bold text-gray-900 tabular-nums">{Number(hospital.admin_count)}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-bold text-gray-900 tabular-nums">{Number(hospital.patient_requests).toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-xs font-medium text-gray-700">{fmtDate(hospital.created_at)}</span>
                                                        <span className="text-[10px] text-gray-400">{relDate(hospital.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="w-20 pr-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150">
                                                        <CopyIdButton id={hospital.hospital_id} />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openHospital(hospital); }}
                                                            title="Lihat admin & hapus"
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3.5 border-t border-gray-50 flex items-center justify-between gap-4">
                        <p className="text-xs text-gray-400">
                            {loading ? "Memuat…" : `${hospitals.length} dari ${total.toLocaleString()} rumah sakit`}
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || loading}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
                                >
                                    <ChevronLeft className="h-3 w-3" /> Prev
                                </button>
                                <span className="text-xs text-gray-400 px-1">{page} / {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || loading}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200"
                                >
                                    Next <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Detail / Delete modal */}
            {openTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 bg-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                                    <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{openTarget.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{openTarget.address || "Alamat tidak tersedia"}</p>
                                    <p className="mt-0.5 text-[10px] text-gray-400 truncate">{openTarget.hospital_id}</p>
                                </div>
                            </div>
                            <button onClick={closeDetail} disabled={deleteBusy} className="text-gray-400 hover:text-gray-600 p-1 -m-1 shrink-0">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Memuat detail…
                                </div>
                            ) : (
                                <>
                                    {detailError && (
                                        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                            <p className="text-xs text-red-700">{detailError}</p>
                                        </div>
                                    )}

                                    {/* Impact counts */}
                                    {detailImpact && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                                Data yang terhubung
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                                <ImpactStat icon={ShieldAlert} label="Admin" value={detailImpact.admins} tone={detailImpact.admins > 0 ? "warn" : "neutral"} />
                                                <ImpactStat icon={FileText} label="Klaim" value={detailImpact.claims} tone={detailImpact.claims > 0 ? "warn" : "neutral"} />
                                                <ImpactStat icon={Activity} label="Request" value={detailImpact.patient_requests} tone={detailImpact.patient_requests > 0 ? "warn" : "neutral"} />
                                                <ImpactStat icon={CalendarClock} label="Janji Temu" value={detailImpact.appointments} tone="neutral" />
                                                <ImpactStat icon={Stethoscope} label="Dokter" value={detailImpact.doctors} tone="neutral" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin list */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                Admin terhubung ({detailAdmins.length})
                                            </p>
                                        </div>
                                        {detailAdmins.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center">
                                                <p className="text-xs text-gray-500">Rumah sakit ini belum memiliki admin yang terhubung.</p>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-gray-100 overflow-hidden">
                                                <ul className="divide-y divide-gray-100">
                                                    {detailAdmins.map((a) => (
                                                            <li key={a.user_role_id} className="flex items-center gap-3 px-4 py-3">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                                        {a.full_name || "(Nama belum diisi)"}
                                                                    </p>
                                                                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Mail className="h-3 w-3" /> {a.email}
                                                                        </span>
                                                                        {a.phone_number && (
                                                                            <span className="inline-flex items-center gap-1">
                                                                                <Phone className="h-3 w-3" /> {a.phone_number}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                                                                        {a.role.replace(/_/g, " ")}
                                                                    </span>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                                                        a.status === "active"
                                                                            ? "bg-emerald-50 text-emerald-700"
                                                                            : "bg-gray-100 text-gray-500"
                                                                    }`}>
                                                                        {a.status}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Danger zone */}
                                    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div>
                                                    <p className="text-sm font-bold text-red-900">Hapus rumah sakit</p>
                                                    <p className="text-xs text-red-700 mt-0.5">
                                                        Semua admin akan otomatis di-detach (akunnya tetap ada), semua klaim akan kehilangan referensi rumah sakit, dan request data pasien milik rumah sakit ini akan dihapus.
                                                    </p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                                                        Ketik <span className="bg-white/80 px-1.5 py-0.5 rounded border border-red-200">{confirmPhrase}</span> untuk konfirmasi
                                                    </label>
                                                    <input
                                                        value={confirmText}
                                                        onChange={(e) => setConfirmText(e.target.value)}
                                                        placeholder={confirmPhrase}
                                                        disabled={deleteBusy}
                                                        className="w-full h-10 px-3 rounded-xl border border-red-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-gray-50/40">
                            <button
                                onClick={closeDetail}
                                disabled={deleteBusy}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteBusy || detailLoading || !confirmMatches}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Hapus rumah sakit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
