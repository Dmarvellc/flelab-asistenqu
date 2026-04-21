"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Briefcase, Search, RefreshCw, ChevronLeft, ChevronRight,
    Users, FileText, ArrowUpDown,
    Plus, X, Loader2, Copy, Check, Building2, UserPlus, Send,
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

    /* ── Create-agency modal state ─────────────────────────────── */
    const [createOpen, setCreateOpen] = useState(false);
    const [createStep, setCreateStep] = useState<1 | 2>(1);
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [agencyForm, setAgencyForm] = useState({ name: "", address: "" });
    const [createdAgency, setCreatedAgency] = useState<{
        agency_id: string;
        name: string;
        slug: string | null;
    } | null>(null);
    const [inviteForm, setInviteForm] = useState({ email: "", fullName: "" });
    const [inviteResult, setInviteResult] = useState<{
        inviteUrl: string;
        email: string;
        expiresAt: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);

    function resetCreateModal() {
        setCreateOpen(false);
        setCreateStep(1);
        setCreateBusy(false);
        setCreateError(null);
        setAgencyForm({ name: "", address: "" });
        setCreatedAgency(null);
        setInviteForm({ email: "", fullName: "" });
        setInviteResult(null);
        setCopied(false);
    }

    async function submitCreateAgency() {
        if (!agencyForm.name.trim()) return;
        setCreateBusy(true);
        setCreateError(null);
        try {
            const res = await fetch("/api/developer/agencies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(agencyForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal membuat agency");
            setCreatedAgency(data.agency);
            setCreateStep(2);
            fetchAgencies();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Gagal membuat agency");
        } finally {
            setCreateBusy(false);
        }
    }

    async function submitInviteMaster() {
        if (!createdAgency || !inviteForm.email.trim()) return;
        setCreateBusy(true);
        setCreateError(null);
        try {
            const res = await fetch(`/api/developer/agencies/${createdAgency.agency_id}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: inviteForm.email,
                    fullName: inviteForm.fullName || undefined,
                    agencyRole: "master_admin",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal membuat undangan");
            setInviteResult({
                inviteUrl: data.inviteUrl,
                email: data.email,
                expiresAt: data.expiresAt,
            });
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Gagal membuat undangan");
        } finally {
            setCreateBusy(false);
        }
    }

    async function copyInviteUrl() {
        if (!inviteResult) return;
        try {
            await navigator.clipboard.writeText(inviteResult.inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    }

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
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                        <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Agencies</h1>
                        <p className="text-xs sm:text-sm text-gray-400 truncate">{total} agencies registered on platform</p>
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

            {/* ── Create-agency 2-step modal ─────────────────────── */}
            {createOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-7 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">
                                Langkah {createStep} / 2
                            </p>
                            <button
                                onClick={resetCreateModal}
                                className="text-gray-400 hover:text-gray-600 p-1 -m-1"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {createStep === 1 ? "Buat Organisasi Agency" : "Undang Master Admin"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            {createStep === 1
                                ? "Buat dulu entitas organisasinya. Belum ada user di sini — admin pertama dibuat di langkah berikutnya."
                                : `Agency "${createdAgency?.name}" sudah dibuat. Sekarang undang user yang akan jadi master admin organisasi ini.`}
                        </p>

                        {createStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Agency *</label>
                                    <input
                                        value={agencyForm.name}
                                        onChange={e => setAgencyForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="PT Asuransi Sehat Sejahtera"
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Alamat (opsional)</label>
                                    <input
                                        value={agencyForm.address}
                                        onChange={e => setAgencyForm(f => ({ ...f, address: e.target.value }))}
                                        placeholder="Jl. Sudirman No. 1, Jakarta"
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                                    />
                                </div>
                                {createError && (
                                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{createError}</p>
                                )}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={resetCreateModal}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={submitCreateAgency}
                                        disabled={createBusy || !agencyForm.name.trim()}
                                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
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
                                    <input
                                        type="email"
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="admin@agency.com"
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Nama Lengkap (opsional)</label>
                                    <input
                                        value={inviteForm.fullName}
                                        onChange={e => setInviteForm(f => ({ ...f, fullName: e.target.value }))}
                                        placeholder="Nama lengkap"
                                        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
                                    <UserPlus className="h-3 w-3 mt-0.5 shrink-0" />
                                    Kami akan generate link undangan. Penerima klik link untuk set password sendiri dan otomatis jadi master admin agency ini.
                                </p>
                                {createError && (
                                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{createError}</p>
                                )}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={resetCreateModal}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
                                    >
                                        Lewati
                                    </button>
                                    <button
                                        onClick={submitInviteMaster}
                                        disabled={createBusy || !inviteForm.email.trim()}
                                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
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
                                    <p className="text-xs text-emerald-700">
                                        Kirim link berikut ke <span className="font-semibold">{inviteResult.email}</span>.
                                        Berlaku sampai {new Date(inviteResult.expiresAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
                                    </p>
                                </div>
                                <div className="flex items-stretch gap-2">
                                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 font-mono break-all">
                                        {inviteResult.inviteUrl}
                                    </div>
                                    <button
                                        onClick={copyInviteUrl}
                                        className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800 shrink-0"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copied ? "Tersalin" : "Salin"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    Link ini hanya muncul sekali. Pastikan disalin sebelum menutup panel.
                                </p>
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={resetCreateModal}
                                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800"
                                    >
                                        Selesai
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Summary Cards ────────────────────────────────────── */}
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

            {/* ── Search & Controls ────────────────────────────────── */}
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 sm:max-w-sm">
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
                    <table className="w-full text-sm min-w-[720px]">
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
