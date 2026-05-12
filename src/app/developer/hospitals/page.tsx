"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import { useToast } from "@/hooks/use-toast";
import {
    Building2, Search, RefreshCw, ChevronLeft, ChevronRight,
    Users, Activity, ChevronsUpDown, ChevronUp, ChevronDown, X, Copy, Check, Trash2, Loader2,
    Mail, Phone, Stethoscope, CalendarClock, FileText, AlertTriangle, ShieldAlert, Pencil, Save, Eye,
    Download, SlidersHorizontal, MoreHorizontal
} from "lucide-react";

import { PageShell, PageHeader, StatCard, StatsGrid } from "@/components/dashboard/page-shell";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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

const COL_NAMES: Record<string, string> = {
    name: "Rumah Sakit",
    admin_count: "Admins",
    patient_requests: "Permintaan Data",
    created_at: "Terdaftar"
};

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

function CopyIdButton({ id }: { id: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            title="Salin ID"
            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors outline-none"
        >
            {copied
                ? <Check className="h-4 w-4 text-emerald-600" />
                : <Copy className="h-4 w-4 text-gray-500 hover:text-gray-900" />}
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
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
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
    
    // Enterprise Table States
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState<SortCol>("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // View Options
    const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(["name", "admin_count", "patient_requests", "created_at"]));
    const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const { run } = useBusy();
    const { toast } = useToast();

    // Detail / delete modal state
    const [openTarget, setOpenTarget] = useState<Hospital | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailAdmins, setDetailAdmins] = useState<HospitalAdmin[]>([]);
    const [detailImpact, setDetailImpact] = useState<HospitalImpact | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", address: "", phone: "", email: "", city: "" });
    const [editError, setEditError] = useState<string | null>(null);

    const fetchHospitals = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: "hospitals",
                page: page.toString(),
                limit: limit.toString(),
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
                setTotalPages(data.meta?.totalPages || Math.ceil(data.meta?.total / limit) || 1);
                setTotal(data.meta?.total || sorted.length);
            }
        } catch { /* silent */ } finally {
            setLoading(false);
        }
    }, [page, limit, search, sortBy, sortOrder]);

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
        setEditMode(false);
        setEditError(null);
        try {
            const res = await fetch(`/api/developer/hospitals/${hospital.hospital_id}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setDetailError(data?.error || "Gagal memuat detail rumah sakit.");
                return;
            }
            setDetailAdmins(data.admins ?? []);
            setDetailImpact(data.impact ?? null);
            if (data.hospital) {
                setEditForm({
                    name: data.hospital.name ?? "",
                    address: data.hospital.address ?? "",
                    phone: data.hospital.phone ?? "",
                    email: data.hospital.email ?? "",
                    city: data.hospital.city ?? "",
                });
            }
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
        setEditMode(false);
        setEditError(null);
    };

    const saveHospitalEdit = async () => {
        if (!openTarget) return;
        setEditError(null);
        await run(async () => {
            const res = await fetch(`/api/developer/hospitals/${openTarget.hospital_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });
            const json = await res.json();
            if (!res.ok) { setEditError(json.error || "Gagal menyimpan."); return; }
            setEditMode(false);
            fetchHospitals();
        }, "Menyimpan…");
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
            setSelected(new Set());
            fetchHospitals();
        } finally {
            setDeleteBusy(false);
        }
    };

    const toggleSort = (col: SortCol) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
        setPage(1);
    };

    const toggleCol = (col: string) => {
        setVisibleCols(prev => {
            const next = new Set(prev);
            if (next.has(col)) {
                if (next.size > 1) next.delete(col);
            } else next.add(col);
            return next;
        });
    };

    const allIds = hospitals.map(h => h.hospital_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelected(prev => {
            const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
        });
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Rumah Sakit", "Alamat", "Admins", "Permintaan Data", "Terdaftar"];
        const rows = hospitals.map(h => [
            h.hospital_id,
            `"${h.name}"`,
            `"${h.address || "-"}"`,
            h.admin_count,
            h.patient_requests,
            fmtDate(h.created_at)
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "data_rumah_sakit.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Berhasil Mengunduh", description: "File CSV data rumah sakit sedang diunduh." });
    };

    function SortTh({ label, col, className = "" }: { label: string; col: SortCol; className?: string }) {
        if (!visibleCols.has(col)) return null;
        const active = sortBy === col;
        return (
            <th onClick={() => toggleSort(col)} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 ${active ? "text-black" : "text-gray-500 hover:text-gray-900"} ${className}`}>
                <span className={cn("inline-flex items-center gap-1", className.includes('text-right') ? 'justify-end w-full' : '')}>
                    {label}
                    {active ? (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
                </span>
            </th>
        );
    }

    const totalAdmins = hospitals.reduce((s, h) => s + Number(h.admin_count), 0);
    const totalRequests = hospitals.reduce((s, h) => s + Number(h.patient_requests), 0);
    const pyClass = density === "compact" ? "py-2.5" : "py-4";

    const confirmPhrase = openTarget ? `HAPUS ${openTarget.name}`.slice(0, 64) : "";
    const confirmMatches = confirmText.trim().toUpperCase() === confirmPhrase.toUpperCase();

    return (
        <>
            <PageShell>
                <PageHeader
                    title="Manajemen Rumah Sakit"
                    description={`${total.toLocaleString()} rumah sakit terdaftar di platform`}
                />

                <StatsGrid cols={3}>
                    <StatCard label="Total Hospitals" value={loading ? "—" : total} icon={Building2} />
                    <StatCard label="Hospital Admins" value={loading ? "—" : totalAdmins} icon={Users} onClick={() => { setSortBy("admin_count"); setSortOrder("desc"); }} />
                    <StatCard label="Patient Requests" value={loading ? "—" : totalRequests} icon={Activity} onClick={() => { setSortBy("patient_requests"); setSortOrder("desc"); }} />
                </StatsGrid>

                {/* Enterprise Table Container */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">

                    {/* Advanced Toolbar */}
                    <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white">
                        {/* Left: Search & Bulk Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative group w-full md:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                                <input
                                    ref={searchRef}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Cari rumah sakit…"
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all placeholder:text-gray-400 font-medium"
                                />
                                {search && (
                                    <button onClick={() => { setSearch(""); setPage(1); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {someSelected && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg shrink-0">
                                    <span className="text-sm font-semibold text-blue-700">{selected.size} terpilih</span>
                                    <div className="w-px h-4 bg-blue-200 mx-1" />
                                    <button
                                        onClick={() => { if (selected.size === 1) openHospital(hospitals.find(h => h.hospital_id === [...selected][0])!); }}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Filters & View Options */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Export CSV Button */}
                            <button onClick={handleExportCSV} className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all outline-none">
                                <Download className="w-4 h-4" />
                                Ekspor CSV
                            </button>

                            {/* View Options Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all outline-none">
                                        <SlidersHorizontal className="w-4 h-4" />
                                        Tampilan
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                                    <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Visibilitas Kolom</DropdownMenuLabel>
                                    {Object.entries(COL_NAMES).map(([key, label]) => (
                                        <DropdownMenuCheckboxItem
                                            key={key}
                                            checked={visibleCols.has(key)}
                                            onCheckedChange={() => toggleCol(key)}
                                            className="font-medium cursor-pointer rounded-md"
                                        >
                                            {label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator className="my-2 bg-gray-100" />
                                    <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Kepadatan Tabel</DropdownMenuLabel>
                                    <DropdownMenuCheckboxItem checked={density === "comfortable"} onCheckedChange={() => setDensity("comfortable")} className="font-medium cursor-pointer rounded-md">Nyaman</DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem checked={density === "compact"} onCheckedChange={() => setDensity("compact")} className="font-medium cursor-pointer rounded-md">Padat</DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <button onClick={fetchHospitals} className="p-2.5 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all" title="Segarkan Data">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-black' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto relative max-h-[600px]">
                        <table className="w-full text-sm min-w-[700px] text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="w-12 pl-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                                        <button
                                            onClick={toggleAll}
                                            className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", allSelected || someSelected ? "bg-black border-black text-white" : "border-gray-300 hover:border-gray-400 bg-white")}
                                        >
                                            {allSelected ? <Check className="w-3 h-3" strokeWidth={3} /> : someSelected ? <div className="w-2 h-0.5 bg-white rounded-full" /> : null}
                                        </button>
                                    </th>
                                    <SortTh label="Rumah Sakit" col="name" />
                                    <SortTh label="Admins" col="admin_count" className="text-right" />
                                    <SortTh label="Permintaan Data" col="patient_requests" className="text-right" />
                                    <SortTh label="Terdaftar" col="created_at" className="text-right" />
                                    <th className="w-14 pr-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 right-0 z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    Array.from({ length: limit }).map((_, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50">
                                            <td className={`pl-5 ${pyClass}`}><div className="w-4 h-4 rounded border border-gray-100 bg-gray-50 animate-pulse" /></td>
                                            {visibleCols.has("name") && <td className={`px-5 ${pyClass}`}><div className="space-y-2"><div className="h-4 w-40 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-32 bg-gray-50 rounded animate-pulse" /></div></td>}
                                            {visibleCols.has("admin_count") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                            {visibleCols.has("patient_requests") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                            {visibleCols.has("created_at") && <td className={`px-5 ${pyClass}`}><div className="flex flex-col items-end space-y-2"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-16 bg-gray-50 rounded animate-pulse" /></div></td>}
                                            <td className={`pr-5 ${pyClass} text-right sticky right-0 bg-white shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]`}><div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : hospitals.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleCols.size + 2} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <Search className="w-10 h-10 mb-4 opacity-20" />
                                                <p className="text-base font-semibold text-gray-700 mb-1">{search ? "Tidak ada rumah sakit yang cocok" : "Belum ada data rumah sakit"}</p>
                                                <p className="text-sm">Coba sesuaikan kata kunci pencarian Anda.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    hospitals.map(hospital => {
                                        const isSelected = selected.has(hospital.hospital_id);
                                        return (
                                            <tr
                                                key={hospital.hospital_id}
                                                onClick={() => openHospital(hospital)}
                                                className={cn("group transition-colors cursor-pointer", isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/80")}
                                            >
                                                <td className={`pl-5 ${pyClass}`} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => toggleRow(hospital.hospital_id, e)}
                                                        className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 group-hover:border-gray-400 bg-white")}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                                    </button>
                                                </td>

                                                {visibleCols.has("name") && (
                                                    <td className={`px-5 ${pyClass}`}>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate max-w-[260px]">{hospital.name}</p>
                                                            {hospital.address && (
                                                                <p className="text-[11px] font-medium text-gray-500 truncate max-w-[280px] mt-0.5">{hospital.address}</p>
                                                            )}
                                                            <p className="text-[10px] text-gray-400 font-mono truncate max-w-[160px] mt-0.5">{hospital.hospital_id}</p>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleCols.has("admin_count") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{Number(hospital.admin_count)}</span>
                                                    </td>
                                                )}

                                                {visibleCols.has("patient_requests") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{Number(hospital.patient_requests).toLocaleString()}</span>
                                                    </td>
                                                )}

                                                {visibleCols.has("created_at") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-sm font-semibold text-gray-900">{fmtDate(hospital.created_at)}</span>
                                                            <span className="text-[11px] font-medium text-gray-500">{relDate(hospital.created_at)}</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {/* Enterprise Sticky Actions Column */}
                                                <td className={cn(`pr-5 ${pyClass} text-right sticky right-0 z-0 transition-colors`, isSelected ? "bg-blue-50/40" : "bg-white group-hover:bg-gray-50/80", "shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]")} onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => openHospital(hospital)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors outline-none" title="Lihat Profil">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors outline-none">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-lg border-gray-100">
                                                                <DropdownMenuItem onClick={() => openHospital(hospital)} className="cursor-pointer font-medium rounded-lg py-2">
                                                                    <Eye className="w-4 h-4 mr-2 text-gray-500" /> Lihat Detail RS
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(hospital.hospital_id); toast({description: "ID disalin ke clipboard"}); }} className="cursor-pointer font-medium rounded-lg py-2">
                                                                    <Copy className="w-4 h-4 mr-2 text-gray-500" /> Salin ID RS
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-gray-100" />
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openHospital(hospital); }} className="cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg py-2">
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Advanced Footer Pagination */}
                    <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                        <div className="flex items-center gap-4 w-full sm:w-auto text-sm font-medium text-gray-500">
                            <div className="flex items-center gap-2">
                                <span>Tampilkan</span>
                                <select 
                                    value={limit} 
                                    onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                                    className="bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10 font-bold text-gray-900"
                                >
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                </select>
                                <span>baris</span>
                            </div>
                            <div className="hidden sm:block w-px h-4 bg-gray-300" />
                            <p className="hidden sm:block">
                                {loading ? "Memuat…" : `${hospitals.length} dari total ${total.toLocaleString()} rumah sakit`}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                                <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <div className="hidden sm:flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                    if (p < 1 || p > totalPages) return null;
                                    return (
                                        <button 
                                            key={p} 
                                            onClick={() => setPage(p)} 
                                            className={cn("w-8 h-8 rounded-lg text-sm font-bold transition-all flex items-center justify-center", p === page ? "bg-black text-white shadow-md" : "text-gray-600 hover:bg-gray-200")}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <span className="sm:hidden text-sm font-bold text-gray-700">Hal {page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </PageShell>

            {/* Detail / Delete modal */}
            {openTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 bg-teal-600 rounded-md flex items-center justify-center shrink-0">
                                    <Building2 className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-lg font-bold text-black truncate">{openTarget.name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{openTarget.address || "Alamat tidak tersedia"}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <p className="text-[10px] text-gray-400 font-mono truncate">{openTarget.hospital_id}</p>
                                        <CopyIdButton id={openTarget.hospital_id} />
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeDetail} disabled={deleteBusy} className="text-gray-400 hover:text-gray-600 p-1 -m-1 shrink-0 rounded hover:bg-gray-100 transition-colors">
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
                                        <div className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2.5">
                                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                            <p className="text-xs text-red-700">{detailError}</p>
                                        </div>
                                    )}

                                    {/* Edit form */}
                                    {editMode ? (
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Edit Info Rumah Sakit</p>
                                            {[
                                                { key: "name", label: "Nama *", placeholder: "Nama rumah sakit" },
                                                { key: "address", label: "Alamat", placeholder: "Jl. Contoh No. 1" },
                                                { key: "phone", label: "Telepon", placeholder: "+62 21 1234567" },
                                                { key: "email", label: "Email", placeholder: "info@rs.com" },
                                                { key: "city", label: "Kota", placeholder: "Jakarta" },
                                            ].map(({ key, label, placeholder }) => (
                                                <div key={key} className="space-y-1">
                                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</label>
                                                    <input
                                                        value={editForm[key as keyof typeof editForm]}
                                                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                                        placeholder={placeholder}
                                                        className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                                                    />
                                                </div>
                                            ))}
                                            {editError && <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{editError}</p>}
                                        </div>
                                    ) : (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setEditMode(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 hover:bg-gray-50 transition-colors text-gray-700"
                                            >
                                                <Pencil className="h-3 w-3" /> Edit Info
                                            </button>
                                        </div>
                                    )}

                                    {/* Impact counts */}
                                    {!editMode && detailImpact && (
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
                                    {!editMode && <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                Admin terhubung ({detailAdmins.length})
                                            </p>
                                        </div>
                                        {detailAdmins.length === 0 ? (
                                            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center flex flex-col items-center">
                                                <Users className="w-8 h-8 text-gray-300 mb-2" />
                                                <p className="text-xs text-gray-500 font-medium">Rumah sakit ini belum memiliki admin yang terhubung.</p>
                                            </div>
                                        ) : (
                                            <div className="rounded-md border border-gray-200 overflow-hidden shadow-sm">
                                                <ul className="divide-y divide-gray-100">
                                                    {detailAdmins.map((a) => (
                                                        <li key={a.user_role_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-bold text-gray-900 truncate">
                                                                    {a.full_name || "(Nama belum diisi)"}
                                                                </p>
                                                                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5 flex-wrap font-medium">
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
                                                            <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 mt-2 sm:mt-0">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                                                                    {a.role.replace(/_/g, " ")}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                                                    a.status === "active"
                                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                                        : "bg-gray-100 text-gray-600 border border-gray-200"
                                                                }`}>
                                                                    {a.status}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>}

                                    {/* Danger zone */}
                                    {!editMode && <div className="rounded-lg border border-red-100 bg-red-50/50 p-4 mt-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-red-100 rounded-md shrink-0">
                                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                <div>
                                                    <p className="text-sm font-bold text-red-900">ZONA BAHAYA: Hapus rumah sakit</p>
                                                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                                        Semua admin akan otomatis terputus dari rumah sakit ini (akunnya tetap ada). Semua klaim akan kehilangan referensi rumah sakit, dan permintaan data pasien dari entitas ini akan dihapus permanen.
                                                    </p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                                                        Ketik <span className="bg-white/80 px-1.5 py-0.5 rounded border border-red-200 select-all font-mono">{confirmPhrase}</span> untuk konfirmasi
                                                    </label>
                                                    <input
                                                        value={confirmText}
                                                        onChange={(e) => setConfirmText(e.target.value)}
                                                        placeholder={confirmPhrase}
                                                        disabled={deleteBusy}
                                                        className="w-full h-10 px-3 rounded-lg border border-red-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50/40">
                            {editMode ? (
                                <>
                                    <button
                                        onClick={() => { setEditMode(false); setEditError(null); }}
                                        className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={saveHospitalEdit}
                                        disabled={!editForm.name.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-40 shadow-md shadow-black/10 transition-all"
                                    >
                                        <Save className="h-4 w-4" /> Simpan Perubahan
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={closeDetail}
                                        disabled={deleteBusy}
                                        className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleteBusy || detailLoading || !confirmMatches}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-600/10 transition-all"
                                    >
                                        {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        Hapus Permanen
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
