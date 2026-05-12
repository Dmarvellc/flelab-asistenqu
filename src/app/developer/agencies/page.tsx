"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import { useToast } from "@/hooks/use-toast";
import {
    Briefcase, Search, RefreshCw, ChevronLeft, ChevronRight,
    ChevronsUpDown, ChevronUp, ChevronDown,
    Users, FileText,
    Plus, X, Loader2, Copy, Check, Building2, UserPlus, Send, Trash2, Mail,
    Eye, Pencil, Save, Download, SlidersHorizontal, MoreHorizontal
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

interface AgencyDetail {
    agency_id: string;
    name: string;
    address: string | null;
    slug: string | null;
    created_at: string;
}

interface AgencyStats {
    agents: number;
    admins: number;
    total_claims: number;
    pending_claims: number;
}

const COL_NAMES: Record<string, string> = {
    name: "Agensi",
    active_agents: "Agen",
    total_claims: "Klaim",
    approval_rate: "Tingkat Persetujuan",
    created_at: "Terdaftar"
};

function DetailRow({ label, value, mono = false, onCopy }: { label: string; value: string; mono?: boolean; onCopy?: () => void }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (!onCopy) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
            <span className="text-xs font-medium text-gray-500 shrink-0 w-28">{label}</span>
            <span className={`text-xs text-black text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
            {onCopy && (
                <button onClick={handleCopy} className="shrink-0 p-1 rounded hover:bg-gray-100">
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                </button>
            )}
        </div>
    );
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

function approvalRate(approved: number, total: number) {
    if (total === 0) return 0;
    return Math.round((approved / total) * 100);
}

type SortCol = "name" | "active_agents" | "total_claims" | "created_at";

export default function AgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
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
    const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(["name", "active_agents", "total_claims", "approval_rate", "created_at"]));
    const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    /* Create modal */
    const [createOpen, setCreateOpen] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [agencyForm, setAgencyForm] = useState({ name: "", address: "" });
    const [createdAgency, setCreatedAgency] = useState<{ agency_id: string; name: string; slug: string | null } | null>(null);
    const [inviteForm, setInviteForm] = useState({ email: "", fullName: "" });
    const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; email: string; expiresAt: string } | null>(null);
    const [copied, setCopied] = useState(false);

    /* Detail / Edit modal */
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailAgency, setDetailAgency] = useState<Agency | null>(null);
    const [detailData, setDetailData] = useState<{ agency: AgencyDetail; stats: AgencyStats } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", address: "" });
    const [editError, setEditError] = useState<string | null>(null);

    /* Per-row invite modal */
    const [rowInviteAgency, setRowInviteAgency] = useState<Agency | null>(null);
    const [rowInviteForm, setRowInviteForm] = useState({ email: "", fullName: "" });
    const [rowInviteBusy, setRowInviteBusy] = useState(false);
    const [rowInviteError, setRowInviteError] = useState<string | null>(null);
    const [rowInviteResult, setRowInviteResult] = useState<{ inviteUrl: string; email: string; expiresAt: string } | null>(null);
    const [rowInviteCopied, setRowInviteCopied] = useState(false);

    /* Delete confirm */
    const [deleteTarget, setDeleteTarget] = useState<Agency | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const { run } = useBusy();
    const { toast } = useToast();

    const fetchAgencies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: "agencies", page: page.toString(), limit: limit.toString(), search });
            const res = await fetch(`/api/developer/entities?${params}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const sorted = [...(data.data ?? [])].sort((a, b) => {
                    const av = a[sortBy] ?? 0; const bv = b[sortBy] ?? 0;
                    if (typeof av === "string") return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                    return sortOrder === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
                });
                setAgencies(sorted);
                setTotalPages(data.meta?.totalPages || Math.ceil(data.meta?.total / limit) || 1);
                setTotal(data.meta?.total || sorted.length);
            }
        } catch { /* silent */ } finally { setLoading(false); }
    }, [page, limit, search, sortBy, sortOrder]);

    useEffect(() => { const t = setTimeout(fetchAgencies, 400); return () => clearTimeout(t); }, [fetchAgencies]);
    useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

    const router = import("next/navigation").then(mod => mod.useRouter).then(useRouter => useRouter());
    // Fallback to window.location.href if next/navigation isn't fully loaded in time
    const navigateToDetail = (id: string) => {
        window.location.href = `/developer/agencies/${id}`;
    };

    function resetCreateModal() {
        setCreateOpen(false); setCreateStep(1); setCreateBusy(false); setCreateError(null);
        setAgencyForm({ name: "", address: "" }); setCreatedAgency(null);
        setInviteForm({ email: "", fullName: "" }); setInviteResult(null); setCopied(false);
    }

    async function submitCreateAgency() {
        if (!agencyForm.name.trim()) return;
        setCreateBusy(true); setCreateError(null);
        let success = false;
        await run(async () => {
            try {
                const res = await fetch("/api/developer/agencies", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...agencyForm, name: agencyForm.name.trim().toUpperCase() }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Gagal membuat agency");
                setCreatedAgency(data.agency); setCreateStep(2); success = true;
            } catch (err) { setCreateError(err instanceof Error ? err.message : "Gagal membuat agency"); }
            finally { setCreateBusy(false); }
        }, "Membuat agency…");
        if (success) {
            fetchAgencies();
            toast({ title: "Berhasil", description: "Agency baru dibuat" });
        }
    }

    async function submitInviteMaster() {
        if (!createdAgency || !inviteForm.email.trim()) return;
        setCreateBusy(true); setCreateError(null);
        await run(async () => {
            try {
                const res = await fetch(`/api/developer/agencies/${createdAgency.agency_id}/invitations`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: inviteForm.email, fullName: inviteForm.fullName || undefined, agencyRole: "master_admin" }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Gagal membuat undangan");
                setInviteResult({ inviteUrl: data.inviteUrl, email: data.email, expiresAt: data.expiresAt });
            } catch (err) { setCreateError(err instanceof Error ? err.message : "Gagal membuat undangan"); }
            finally { setCreateBusy(false); }
        }, "Mengirim undangan…");
    }

    async function submitRowInvite() {
        if (!rowInviteAgency || !rowInviteForm.email.trim()) return;
        setRowInviteBusy(true); setRowInviteError(null);
        try {
            const res = await fetch(`/api/developer/agencies/${rowInviteAgency.agency_id}/invitations`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: rowInviteForm.email, fullName: rowInviteForm.fullName || undefined, agencyRole: "master_admin" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal membuat undangan");
            setRowInviteResult({ inviteUrl: data.inviteUrl, email: data.email, expiresAt: data.expiresAt });
            toast({ title: "Berhasil", description: "Undangan telah dibuat" });
        } catch (err) { setRowInviteError(err instanceof Error ? err.message : "Gagal membuat undangan"); }
        finally { setRowInviteBusy(false); }
    }

    async function handleDeleteAgency() {
        if (!deleteTarget) return;
        setDeleteBusy(true);
        try {
            const res = await fetch(`/api/developer/agencies/${deleteTarget.agency_id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal menghapus agency");
            setDeleteTarget(null);
            setSelected(new Set());
            fetchAgencies();
            toast({ title: "Berhasil", description: "Agency telah dihapus" });
        } catch (err) { toast({ title: "Gagal", description: err instanceof Error ? err.message : "Gagal menghapus agency", variant: "destructive" }); }
        finally { setDeleteBusy(false); }
    }

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

    const allIds = agencies.map(a => a.agency_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelected(prev => {
            const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
        });
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Agensi", "Alamat", "Agen Aktif", "Total Agen", "Total Klaim", "Klaim Disetujui", "Terdaftar"];
        const rows = agencies.map(a => [
            a.agency_id,
            `"${a.name}"`,
            `"${a.address || "-"}"`,
            a.active_agents,
            a.total_agents,
            a.total_claims,
            a.approved_claims,
            fmtDate(a.created_at)
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "data_agensi.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Berhasil Mengunduh", description: "File CSV data agensi sedang diunduh." });
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

    const totalAgents = agencies.reduce((s, a) => s + Number(a.active_agents), 0);
    const totalClaims = agencies.reduce((s, a) => s + Number(a.total_claims), 0);
    const pyClass = density === "compact" ? "py-2.5" : "py-4";

    return (
        <>
            <PageShell>
                <PageHeader
                    title="Manajemen Agensi"
                    description={`${total.toLocaleString()} agensi terdaftar di platform`}
                    actions={
                        <button
                            onClick={() => { resetCreateModal(); setCreateOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800 shadow-md transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            Buat Agensi
                        </button>
                    }
                />

                <StatsGrid cols={3}>
                    <StatCard label="Total Agensi" value={loading ? "—" : total} icon={Briefcase} onClick={() => { setSortBy("created_at"); setSortOrder("desc"); }} />
                    <StatCard label="Agen Aktif" value={loading ? "—" : totalAgents} icon={Users} onClick={() => { setSortBy("active_agents"); setSortOrder("desc"); }} />
                    <StatCard label="Total Klaim" value={loading ? "—" : totalClaims} icon={FileText} onClick={() => { setSortBy("total_claims"); setSortOrder("desc"); }} />
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
                                    placeholder="Cari nama agensi…"
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
                                        onClick={() => { if (selected.size === 1) setDeleteTarget(agencies.find(a => a.agency_id === [...selected][0])!); }}
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

                            <button onClick={fetchAgencies} className="p-2.5 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all" title="Segarkan Data">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-black' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table Area (Scrollable with sticky header) */}
                    <div className="overflow-x-auto relative max-h-[600px]">
                        <table className="w-full text-sm min-w-[760px] text-left border-collapse">
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
                                    <SortTh label="Agensi" col="name" />
                                    <SortTh label="Agen" col="active_agents" className="text-right" />
                                    <SortTh label="Klaim" col="total_claims" className="text-right" />
                                    {visibleCols.has("approval_rate") && <th className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Tingkat Persetujuan</th>}
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
                                            {visibleCols.has("active_agents") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-12 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                            {visibleCols.has("total_claims") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-10 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                            {visibleCols.has("approval_rate") && <td className={`px-5 ${pyClass}`}><div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse mx-auto" /></td>}
                                            {visibleCols.has("created_at") && <td className={`px-5 ${pyClass}`}><div className="flex flex-col items-end space-y-2"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-16 bg-gray-50 rounded animate-pulse" /></div></td>}
                                            <td className={`pr-5 ${pyClass} text-right sticky right-0 bg-white shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]`}><div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : agencies.length === 0 ? (
                                    <tr>
                                        <td colSpan={visibleCols.size + 2} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <Search className="w-10 h-10 mb-4 opacity-20" />
                                                <p className="text-base font-semibold text-gray-700 mb-1">{search ? "Tidak ada agensi yang cocok" : "Belum ada data agensi"}</p>
                                                <p className="text-sm">Coba sesuaikan kata kunci pencarian Anda.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    agencies.map(agency => {
                                        const rate = approvalRate(Number(agency.approved_claims), Number(agency.total_claims));
                                        const isSelected = selected.has(agency.agency_id);
                                        return (
                                            <tr
                                                key={agency.agency_id}
                                                onClick={() => navigateToDetail(agency.agency_id)}
                                                className={cn("group transition-colors cursor-pointer", isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/80")}
                                            >
                                                <td className={`pl-5 ${pyClass}`} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => toggleRow(agency.agency_id, e)}
                                                        className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 group-hover:border-gray-400 bg-white")}
                                                    >
                                                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                                    </button>
                                                </td>
                                                
                                                {visibleCols.has("name") && (
                                                    <td className={`px-5 ${pyClass}`}>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate max-w-[260px]">{agency.name}</p>
                                                            {agency.address && <p className="text-[11px] font-medium text-gray-500 truncate max-w-[280px] mt-0.5">{agency.address}</p>}
                                                            <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{agency.agency_id}</p>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleCols.has("active_agents") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-sm font-bold text-gray-900 tabular-nums">{Number(agency.active_agents).toLocaleString()}</span>
                                                            <span className="text-[11px] font-medium text-gray-500">{Number(agency.total_agents)} total</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleCols.has("total_claims") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <span className="text-sm font-bold text-gray-900 tabular-nums">{Number(agency.total_claims).toLocaleString()}</span>
                                                    </td>
                                                )}

                                                {visibleCols.has("approval_rate") && (
                                                    <td className={`px-5 ${pyClass}`}>
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={`text-[11px] font-bold tracking-wider ${rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-gray-500"}`}>
                                                                {Number(agency.total_claims) > 0 ? `${rate}% Disetujui` : "—"}
                                                            </span>
                                                            {Number(agency.total_claims) > 0 && (
                                                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                                                    <div
                                                                        className={cn("h-full rounded-full transition-all duration-500", rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-gray-400")}
                                                                        style={{ width: `${rate}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                {visibleCols.has("created_at") && (
                                                    <td className={`px-5 ${pyClass} text-right`}>
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-sm font-semibold text-gray-900">{fmtDate(agency.created_at)}</span>
                                                            <span className="text-[11px] font-medium text-gray-500">{relDate(agency.created_at)}</span>
                                                        </div>
                                                    </td>
                                                )}

                                                {/* Enterprise Sticky Actions Column */}
                                                <td className={cn(`pr-5 ${pyClass} text-right sticky right-0 z-0 transition-colors`, isSelected ? "bg-blue-50/40" : "bg-white group-hover:bg-gray-50/80", "shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]")} onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => navigateToDetail(agency.agency_id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors outline-none" title="Lihat Profil">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors outline-none">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border-gray-100">
                                                                <DropdownMenuItem onClick={() => navigateToDetail(agency.agency_id)} className="cursor-pointer font-medium rounded-lg py-2">
                                                                    <Eye className="w-4 h-4 mr-2 text-gray-500" /> Lihat Detail Agensi
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRowInviteAgency(agency); setRowInviteForm({ email: "", fullName: "" }); setRowInviteResult(null); setRowInviteError(null); setRowInviteCopied(false); }} className="cursor-pointer font-medium rounded-lg py-2 text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                                                                    <Mail className="w-4 h-4 mr-2" /> Undang Master Admin
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(agency.agency_id); toast({description: "ID disalin ke clipboard"}); }} className="cursor-pointer font-medium rounded-lg py-2">
                                                                    <Copy className="w-4 h-4 mr-2 text-gray-500" /> Salin ID Agensi
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-gray-100" />
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTarget(agency); }} className="cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg py-2">
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
                                {loading ? "Memuat…" : `${agencies.length} dari total ${total.toLocaleString()} agensi`}
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

            {/* Create Agency 2-step modal */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Langkah {createStep} / 2</p>
                            <button onClick={resetCreateModal} className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <h3 className="text-xl font-bold text-black mb-1">
                            {createStep === 1 ? "Buat Organisasi Agensi Baru" : "Undang Master Admin"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {createStep === 1
                                ? "Pertama, buat entitas organisasinya terlebih dahulu. Anda bisa menambahkan admin setelah entitas ini dibuat."
                                : `Agensi "${createdAgency?.name}" berhasil dibuat. Sekarang undang user pertama untuk menjadi Master Admin.`}
                        </p>
                        {createStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Agensi *</label>
                                    <input value={agencyForm.name} onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="PT ASURANSI SEJAHTERA" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 uppercase tracking-wide transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Alamat (opsional)</label>
                                    <input value={agencyForm.address} onChange={e => setAgencyForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. Sudirman No. 1, Jakarta" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                                </div>
                                {createError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{createError}</p>}
                                <div className="flex justify-end gap-3 mt-8">
                                    <button onClick={resetCreateModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
                                    <button onClick={submitCreateAgency} disabled={createBusy || !agencyForm.name.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-40 transition-all shadow-md">
                                        {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                                        Buat & Lanjut
                                    </button>
                                </div>
                            </div>
                        )}
                        {createStep === 2 && !inviteResult && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Master Admin *</label>
                                    <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@agensi.com" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Lengkap (opsional)</label>
                                    <input value={inviteForm.fullName} onChange={e => setInviteForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                                </div>
                                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex gap-2 mt-2">
                                    <UserPlus className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium text-blue-800 leading-relaxed">
                                        Sebuah URL undangan unik akan digenerate. Anda dapat mengirimkan URL ini kepada penerima untuk mengatur kata sandi mereka secara mandiri.
                                    </p>
                                </div>
                                {createError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mt-2">{createError}</p>}
                                <div className="flex justify-end gap-3 mt-8">
                                    <button onClick={resetCreateModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Lewati</button>
                                    <button onClick={submitInviteMaster} disabled={createBusy || !inviteForm.email.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md shadow-blue-600/10">
                                        {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Buat Undangan
                                    </button>
                                </div>
                            </div>
                        )}
                        {createStep === 2 && inviteResult && (
                            <div className="space-y-5">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                                    <p className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-1.5"><Check className="h-4 w-4" /> Undangan Berhasil Dibuat</p>
                                    <p className="text-[11px] text-emerald-700 font-medium mt-2">Silakan bagikan tautan ini ke <span className="font-bold">{inviteResult.email}</span>. Tautan berlaku hingga {new Date(inviteResult.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</p>
                                </div>
                                <div className="flex items-stretch gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 break-all select-all flex items-center">{inviteResult.inviteUrl}</div>
                                    <button onClick={async () => { await navigator.clipboard.writeText(inviteResult.inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={cn("flex items-center gap-1.5 px-4 rounded-lg text-sm font-bold transition-all shrink-0", copied ? "bg-emerald-600 text-white" : "bg-black text-white hover:bg-gray-800")}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copied ? "Tersalin" : "Salin URL"}
                                    </button>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <p className="text-[11px] font-bold text-amber-800 flex items-start gap-1.5">
                                        ⚠️ PENTING: Tautan ini tidak akan ditampilkan lagi setelah Anda menutup panel ini. Pastikan Anda telah menyalinnya.
                                    </p>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button onClick={resetCreateModal} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800 shadow-md transition-all">Selesai</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Per-row Invite Modal */}
            {rowInviteAgency && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Undang Master Admin</p>
                            <button onClick={() => setRowInviteAgency(null)} className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <h3 className="text-xl font-bold text-black mb-1">{rowInviteAgency.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">Undang user baru yang akan menjadi pengelola utama (master admin) untuk agensi ini.</p>
                        {!rowInviteResult ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Master Admin *</label>
                                    <input type="email" value={rowInviteForm.email} onChange={e => setRowInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@agensi.com" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Lengkap (opsional)</label>
                                    <input value={rowInviteForm.fullName} onChange={e => setRowInviteForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap" className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                                </div>
                                {rowInviteError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mt-2">{rowInviteError}</p>}
                                <div className="flex justify-end gap-3 mt-8">
                                    <button onClick={() => setRowInviteAgency(null)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
                                    <button onClick={submitRowInvite} disabled={rowInviteBusy || !rowInviteForm.email.trim()} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md shadow-blue-600/10">
                                        {rowInviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Buat Undangan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                                    <p className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-1.5"><Check className="h-4 w-4" /> Undangan Berhasil Dibuat</p>
                                    <p className="text-[11px] text-emerald-700 font-medium mt-2">Kirim tautan pendaftaran ini ke <span className="font-bold">{rowInviteResult.email}</span>. Berlaku hingga {new Date(rowInviteResult.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</p>
                                </div>
                                <div className="flex items-stretch gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono text-gray-700 break-all select-all flex items-center">{rowInviteResult.inviteUrl}</div>
                                    <button onClick={async () => { await navigator.clipboard.writeText(rowInviteResult!.inviteUrl); setRowInviteCopied(true); setTimeout(() => setRowInviteCopied(false), 2000); }} className={cn("flex items-center gap-1.5 px-4 rounded-lg text-sm font-bold transition-all shrink-0", rowInviteCopied ? "bg-emerald-600 text-white" : "bg-black text-white hover:bg-gray-800")}>
                                        {rowInviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {rowInviteCopied ? "Tersalin" : "Salin URL"}
                                    </button>
                                </div>
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <p className="text-[11px] font-bold text-amber-800 flex items-start gap-1.5">
                                        ⚠️ PENTING: Tautan ini tidak akan ditampilkan lagi setelah Anda menutup panel ini. Pastikan Anda telah menyalinnya.
                                    </p>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <button onClick={() => setRowInviteAgency(null)} className="px-6 py-2.5 rounded-lg text-sm font-bold bg-black text-white hover:bg-gray-800 shadow-md transition-all">Selesai</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-red-900">Hapus Agensi</h3>
                                <p className="text-sm font-medium text-gray-600 mt-0.5">{deleteTarget.name}</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Anda yakin ingin menghapus agensi ini secara permanen?</p>
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-6">
                            <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                                ⚠️ User yang terhubung ke agensi ini <span className="underline">tidak</span> akan dihapus akunnya, namun mereka akan kehilangan akses (di-detach) dan agensi ini tidak akan dapat diakses lagi.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteTarget(null)} disabled={deleteBusy} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Batal</button>
                            <button onClick={handleDeleteAgency} disabled={deleteBusy} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-all shadow-md shadow-red-600/10">
                                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Ya, Hapus Agensi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
