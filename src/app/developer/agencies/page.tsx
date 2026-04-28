"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import {
    Briefcase, Search, RefreshCw, ChevronLeft, ChevronRight,
    ChevronsUpDown, ChevronUp, ChevronDown,
    Users, FileText,
    Plus, X, Loader2, Copy, Check, Building2, UserPlus, Send, Trash2, Mail,
} from "lucide-react";

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

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
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
    const { run } = useBusy();

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
        if (success) fetchAgencies();
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

    const fetchAgencies = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: "agencies", page: page.toString(), limit: "15", search });
            const res = await fetch(`/api/developer/entities?${params}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const sorted = [...(data.data ?? [])].sort((a, b) => {
                    const av = a[sortBy] ?? 0; const bv = b[sortBy] ?? 0;
                    if (typeof av === "string") return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
                    return sortOrder === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
                });
                setAgencies(sorted); setTotalPages(data.meta.totalPages); setTotal(data.meta.total);
            }
        } catch { /* silent */ } finally { setLoading(false); }
    }, [page, search, sortBy, sortOrder]);

    useEffect(() => { const t = setTimeout(fetchAgencies, 400); return () => clearTimeout(t); }, [fetchAgencies]);
    useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

    const toggleSort = (col: SortCol) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

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
            setDeleteTarget(null); fetchAgencies();
        } catch (err) { alert(err instanceof Error ? err.message : "Gagal menghapus agency"); }
        finally { setDeleteBusy(false); }
    }

    const allIds = agencies.map(a => a.agency_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string) => setSelected(prev => {
        const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
    });

    const totalAgents = agencies.reduce((s, a) => s + Number(a.active_agents), 0);
    const totalClaims = agencies.reduce((s, a) => s + Number(a.total_claims), 0);

    function SortTh({ label, col, className = "" }: { label: string; col: SortCol; className?: string }) {
        const active = sortBy === col;
        return (
            <th onClick={() => toggleSort(col)} className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? "text-gray-800" : "text-gray-400 hover:text-gray-600"} ${className}`}>
                <span className="inline-flex items-center gap-1">
                    {label}
                    {active ? (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </span>
            </th>
        );
    }

    return (
        <>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                            <Briefcase className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Agencies</h1>
                            <p className="text-xs sm:text-sm text-gray-400 truncate">{total} agencies on platform</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { resetCreateModal(); setCreateOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 shadow-md transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Buat Agency
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

                {/* Table Card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                    {/* Toolbar */}
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {someSelected ? (
                                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-150">
                                    <span className="text-sm font-semibold text-gray-700">{selected.size} dipilih</span>
                                    <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                                        Batal
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-bold text-gray-900">Agencies</span>
                                    <span className="bg-gray-100 text-gray-500 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">{total}</span>
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
                                        placeholder="Cari agency…"
                                        className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1"
                                    />
                                </div>
                            </div>
                            <button onClick={() => { setLoading(true); fetchAgencies(); }} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[760px]">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/40">
                                    <th className="w-10 pl-5 py-3.5">
                                        <button
                                            onClick={toggleAll}
                                            className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-all ${allSelected || someSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-500"}`}
                                        >
                                            {allSelected ? (
                                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            ) : someSelected ? (
                                                <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><path d="M1 1H7" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                            ) : null}
                                        </button>
                                    </th>
                                    <SortTh label="Agency" col="name" className="text-left" />
                                    <SortTh label="Agents" col="active_agents" className="text-right" />
                                    <SortTh label="Claims" col="total_claims" className="text-right" />
                                    <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Approval Rate</th>
                                    <SortTh label="Joined" col="created_at" className="text-right" />
                                    <th className="w-20 pr-5 py-3.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b border-gray-50">
                                            <td className="w-10 pl-5 py-4"><div className="w-[15px] h-[15px] rounded-[3px] bg-gray-100 animate-pulse" /></td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-1.5">
                                                    <div className="h-3.5 w-40 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-2.5 w-24 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-8 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="px-5 py-4"><div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse mx-auto" /></td>
                                            <td className="px-5 py-4 text-right"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                            <td className="w-20 pr-5 py-4" />
                                        </tr>
                                    ))
                                ) : agencies.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                                            {search ? `No agencies matching "${search}"` : "No agencies found"}
                                        </td>
                                    </tr>
                                ) : (
                                    agencies.map(agency => {
                                        const rate = approvalRate(Number(agency.approved_claims), Number(agency.total_claims));
                                        const isSelected = selected.has(agency.agency_id);
                                        return (
                                            <tr
                                                key={agency.agency_id}
                                                className={`border-b border-gray-50 group/row transition-colors ${isSelected ? "bg-gray-50/70" : "hover:bg-gray-50/50"}`}
                                            >
                                                <td className="w-10 pl-5 py-4">
                                                    <button
                                                        onClick={() => toggleRow(agency.agency_id)}
                                                        className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-all ${isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 opacity-0 group-hover/row:opacity-100 hover:border-gray-500"}`}
                                                    >
                                                        {isSelected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{agency.name}</p>
                                                        {agency.address && <p className="text-xs text-gray-400 truncate max-w-[220px]">{agency.address}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="font-bold text-gray-900 tabular-nums">{Number(agency.active_agents).toLocaleString()}</span>
                                                        <span className="text-xs text-gray-400">{Number(agency.total_agents)} total</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="font-bold text-gray-900 tabular-nums">{Number(agency.total_claims).toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-4">
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
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-xs font-medium text-gray-700">{fmtDate(agency.created_at)}</span>
                                                        <span className="text-[10px] text-gray-400">{relDate(agency.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="w-20 pr-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150">
                                                        <button
                                                            onClick={() => { setRowInviteAgency(agency); setRowInviteForm({ email: "", fullName: "" }); setRowInviteResult(null); setRowInviteError(null); setRowInviteCopied(false); }}
                                                            title="Invite Master Admin"
                                                            className="p-1.5 rounded-lg hover:bg-violet-50 transition-colors"
                                                        >
                                                            <Mail className="h-3.5 w-3.5 text-violet-500" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(agency)}
                                                            title="Hapus Agency"
                                                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
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
                            {loading ? "Loading…" : `${agencies.length} dari ${total.toLocaleString()} agencies · Page ${page} of ${totalPages}`}
                        </p>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200">
                                    <ChevronLeft className="h-3 w-3" /> Prev
                                </button>
                                <span className="text-xs text-gray-400 px-1">{page} / {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200">
                                    Next <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Create Agency 2-step modal */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Langkah {createStep} / 2</p>
                            <button onClick={resetCreateModal} className="text-gray-400 hover:text-gray-600 p-1 -m-1"><X className="h-5 w-5" /></button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {createStep === 1 ? "Buat Organisasi Agency" : "Undang Master Admin"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            {createStep === 1
                                ? "Buat dulu entitas organisasinya. Belum ada user di sini — admin pertama dibuat di langkah berikutnya."
                                : `Agency "${createdAgency?.name}" sudah dibuat. Sekarang undang user yang akan jadi master admin.`}
                        </p>
                        {createStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Agency *</label>
                                    <input value={agencyForm.name} onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value.toUpperCase() }))} placeholder="PT ASURANSI SEHAT SEJAHTERA" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 uppercase tracking-wide" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Alamat (opsional)</label>
                                    <input value={agencyForm.address} onChange={e => setAgencyForm(f => ({ ...f, address: e.target.value }))} placeholder="Jl. Sudirman No. 1, Jakarta" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                                </div>
                                {createError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{createError}</p>}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={resetCreateModal} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Batal</button>
                                    <button onClick={submitCreateAgency} disabled={createBusy || !agencyForm.name.trim()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40">
                                        {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                                        Buat Agency & Lanjut
                                    </button>
                                </div>
                            </div>
                        )}
                        {createStep === 2 && !inviteResult && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Master Admin *</label>
                                    <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@agency.com" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Lengkap (opsional)</label>
                                    <input value={inviteForm.fullName} onChange={e => setInviteForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                                    <UserPlus className="h-3 w-3 mt-0.5 shrink-0" />
                                    Kami akan generate link undangan. Penerima klik link untuk set password sendiri.
                                </p>
                                {createError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{createError}</p>}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={resetCreateModal} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Lewati</button>
                                    <button onClick={submitInviteMaster} disabled={createBusy || !inviteForm.email.trim()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40">
                                        {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Buat Undangan
                                    </button>
                                </div>
                            </div>
                        )}
                        {createStep === 2 && inviteResult && (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-emerald-900 mb-1">Undangan dibuat</p>
                                    <p className="text-xs text-emerald-700">Kirim link ke <span className="font-semibold">{inviteResult.email}</span>. Berlaku sampai {new Date(inviteResult.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</p>
                                </div>
                                <div className="flex items-stretch gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 break-all">{inviteResult.inviteUrl}</div>
                                    <button onClick={async () => { await navigator.clipboard.writeText(inviteResult.inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 shrink-0">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copied ? "Tersalin" : "Salin"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Link ini hanya muncul sekali. Pastikan disalin sebelum menutup panel.</p>
                                <div className="flex justify-end pt-2">
                                    <button onClick={resetCreateModal} className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800">Selesai</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Per-row Invite Modal */}
            {rowInviteAgency && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Undang Master Admin</p>
                            <button onClick={() => setRowInviteAgency(null)} className="text-gray-400 hover:text-gray-600 p-1 -m-1"><X className="h-5 w-5" /></button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{rowInviteAgency.name}</h3>
                        <p className="text-sm text-gray-500 mb-5">Undang user yang akan jadi master admin organisasi ini.</p>
                        {!rowInviteResult ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email Master Admin *</label>
                                    <input type="email" value={rowInviteForm.email} onChange={e => setRowInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@agency.com" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Lengkap (opsional)</label>
                                    <input value={rowInviteForm.fullName} onChange={e => setRowInviteForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nama lengkap" className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400" />
                                </div>
                                {rowInviteError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{rowInviteError}</p>}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setRowInviteAgency(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Batal</button>
                                    <button onClick={submitRowInvite} disabled={rowInviteBusy || !rowInviteForm.email.trim()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40">
                                        {rowInviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Buat Undangan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-emerald-900 mb-1">Undangan dibuat ✓</p>
                                    <p className="text-xs text-emerald-700">Kirim link ke <span className="font-semibold">{rowInviteResult.email}</span>. Berlaku sampai {new Date(rowInviteResult.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.</p>
                                </div>
                                <div className="flex items-stretch gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 break-all">{rowInviteResult.inviteUrl}</div>
                                    <button onClick={async () => { await navigator.clipboard.writeText(rowInviteResult!.inviteUrl); setRowInviteCopied(true); setTimeout(() => setRowInviteCopied(false), 2000); }} className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 shrink-0">
                                        {rowInviteCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {rowInviteCopied ? "Tersalin" : "Salin"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">Link ini hanya muncul sekali. Pastikan disalin sebelum menutup panel.</p>
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setRowInviteAgency(null)} className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800">Selesai</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                <Trash2 className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Hapus Agency</h3>
                                <p className="text-sm text-gray-500">{deleteTarget.name}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Apakah kamu yakin ingin menghapus agency ini?</p>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-5">Users yang terhubung <strong>tidak</strong> akan dihapus, tapi akan di-detach dari agency ini.</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} disabled={deleteBusy} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">Batal</button>
                            <button onClick={handleDeleteAgency} disabled={deleteBusy} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">
                                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Ya, Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
