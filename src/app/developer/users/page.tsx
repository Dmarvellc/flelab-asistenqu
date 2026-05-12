"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Search, RefreshCw, ChevronLeft, ChevronRight,
    ChevronsUpDown, ChevronUp, ChevronDown,
    Edit, Trash2, UserPlus, Loader2, Copy, Check, X,
    Users, Activity, Clock, ShieldAlert, Filter, SlidersHorizontal, MoreHorizontal, Download, User as UserIcon, CalendarDays, Key
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ActionModal } from "@/components/ui/action-modal";
import { useBusy } from "@/components/ui/busy-overlay-provider";
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
type User = {
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    last_login?: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    agent: { bg: "bg-blue-50", text: "text-blue-700" },
    admin_agency: { bg: "bg-violet-50", text: "text-violet-700" },
    hospital_admin: { bg: "bg-teal-50", text: "text-teal-700" },
    insurance_admin: { bg: "bg-amber-50", text: "text-amber-700" },
    developer: { bg: "bg-black", text: "text-white" },
    super_admin: { bg: "bg-gray-100", text: "text-gray-700" },
};

const STATUS_CFG = {
    ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
    PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", ring: "ring-amber-200" },
    REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", ring: "ring-red-200" },
    SUSPENDED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", ring: "ring-gray-200" },
} as const;

const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"] as const;

const COL_NAMES: Record<string, string> = {
    email: "Pengguna",
    role: "Role",
    status: "Status",
    last_login: "Aktivitas",
    created_at: "Bergabung"
};

function fmtRole(r: string) {
    return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m}m lalu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}j lalu`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d}h lalu` : fmtDate(iso);
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-200 transition-colors" title="Salin ID">
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500 hover:text-gray-900" />}
        </button>
    );
}

function EditModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
    const [role, setRole] = useState(user.role);
    const [status, setStatus] = useState(user.status);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/users/${user.user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role, status }),
            });
            if (res.ok) { toast({ title: "Tersimpan", description: "Pengguna berhasil diperbarui" }); onSaved(); onClose(); }
            else toast({ title: "Error", description: "Gagal memperbarui pengguna", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Gagal memperbarui pengguna", variant: "destructive" });
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-black">Edit Pengguna</h3>
                        <p className="text-sm text-gray-500 mt-1 truncate max-w-[280px]">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Role Akses</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all font-medium">
                            <option value="agent">Agen</option>
                            <option value="admin_agency">Admin Agensi</option>
                            <option value="hospital_admin">Admin Rumah Sakit</option>
                            <option value="insurance_admin">Admin Asuransi</option>
                            <option value="developer">Developer</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status Akun</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all font-medium">
                            <option value="ACTIVE">Aktif</option>
                            <option value="PENDING">Pending</option>
                            <option value="SUSPENDED">Ditangguhkan</option>
                            <option value="REJECTED">Ditolak</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all">Batal</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-black hover:bg-gray-900 shadow-md disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Simpan Perubahan
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("agent");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const needsProfile = role === "agent" || role === "hospital_admin";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/developer/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role, fullName: needsProfile ? fullName : undefined, phoneNumber: needsProfile ? phone : undefined }),
            });
            const data = await res.json();
            if (res.ok) { toast({ title: "Berhasil", description: "Pengguna berhasil dibuat" }); onCreated(); onClose(); }
            else toast({ title: "Error", description: data.error || "Gagal membuat pengguna", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Gagal membuat pengguna", variant: "destructive" });
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-black">Tambah Pengguna Baru</h3>
                        <p className="text-sm text-gray-500 mt-1">Buat kredensial akses ke dalam platform</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Role Akses</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all font-medium">
                            <option value="agent">Agen</option>
                            <option value="admin_agency">Admin Agensi</option>
                            <option value="hospital_admin">Admin Rumah Sakit</option>
                            <option value="insurance_admin">Admin Asuransi</option>
                            <option value="developer">Developer</option>
                        </select>
                    </div>
                    <div className="border-t border-gray-100 pt-5 space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Kredensial Login</label>
                            <div className="space-y-3">
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Alamat email (misal: user@example.com)" className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-500 transition-all shadow-sm" />
                                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Kata sandi" className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-500 transition-all shadow-sm" />
                            </div>
                        </div>
                    </div>
                    {needsProfile && (
                        <div className="border-t border-gray-100 pt-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Informasi Profil</label>
                                <div className="space-y-3">
                                    <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nama lengkap" className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-500 transition-all shadow-sm" />
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Nomor Telepon (+62...)" className="w-full px-4 py-3 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-500 transition-all shadow-sm" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all">Batal</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-black hover:bg-gray-900 shadow-md disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Buat Akun
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Enterprise Table States
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    
    // Filters
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    // View Options
    const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(["email", "role", "status", "last_login", "created_at"]));
    const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

    const [editUser, setEditUser] = useState<User | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const { toast } = useToast();
    const { run } = useBusy();
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search, sortBy, sortOrder });
            if (roleFilter) params.set("role", roleFilter);
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/users?${params}`);
            const data = await res.json();
            if (res.ok) { setUsers(data.data); setTotalPages(data.meta.totalPages); setTotal(data.meta.total); }
            else { toast({ title: "Error", description: data.error ?? "Gagal memuat pengguna", variant: "destructive" }); }
        } catch {
            toast({ title: "Error", description: "Gagal memuat pengguna", variant: "destructive" });
        } finally { setLoading(false); }
    }, [page, limit, search, sortBy, sortOrder, roleFilter, statusFilter, toast]);

    useEffect(() => { const t = setTimeout(fetchUsers, 400); return () => clearTimeout(t); }, [fetchUsers]);

    const handleDelete = async (userId: string) => {
        await run(async () => {
            try {
                const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
                const body = await res.json().catch(() => ({} as Record<string, unknown>));
                if (res.ok) {
                    const msg = (body as { message?: string }).message ?? "Pengguna berhasil dihapus";
                    toast({ title: (body as { softDeleted?: boolean }).softDeleted ? "Pengguna ditangguhkan" : "Dihapus", description: msg });
                    fetchUsers();
                } else {
                    toast({ title: "Error", description: (body as { error?: string }).error ?? "Gagal menghapus pengguna", variant: "destructive" });
                }
            } catch (e) {
                toast({ title: "Error", description: e instanceof Error ? e.message : "Gagal menghapus pengguna", variant: "destructive" });
            }
        }, "Menghapus pengguna…");
    };

    const toggleSort = (col: string) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
        setPage(1);
    };

    const toggleCol = (col: string) => {
        setVisibleCols(prev => {
            const next = new Set(prev);
            if (next.has(col)) {
                if (next.size > 1) next.delete(col); // Prevent hiding all cols
            } else next.add(col);
            return next;
        });
    };

    const allIds = users.map(u => u.user_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string) => setSelected(prev => {
        const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
    });

    const handleExportCSV = () => {
        const headers = ["ID", "Email", "Role", "Status", "Terakhir Aktif", "Bergabung"];
        const rows = users.map(u => [
            u.user_id, 
            u.email, 
            u.role, 
            u.status, 
            u.last_login ? fmtDate(u.last_login) : "Belum pernah", 
            fmtDate(u.created_at)
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "data_pengguna.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Berhasil Mengunduh", description: "File CSV data pengguna sedang diunduh." });
    };

    function SortTh({ label, col, className = "" }: { label: string; col: string; className?: string }) {
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

    const ROLES = [
        { value: "agent", label: "Agen" },
        { value: "admin_agency", label: "Admin Agensi" },
        { value: "hospital_admin", label: "Admin Rumah Sakit" },
        { value: "insurance_admin", label: "Admin Asuransi" },
        { value: "developer", label: "Developer" },
    ];

    const hasFilters = roleFilter || statusFilter;
    const pyClass = density === "compact" ? "py-2.5" : "py-4";

    return (
        <PageShell>
            <PageHeader
                title="Manajemen Pengguna"
                description={`${total.toLocaleString()} pengguna terdaftar di platform`}
                actions={
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        Tambah Pengguna Baru
                    </button>
                }
            />

            <StatsGrid cols={4}>
                <StatCard label="Total Pengguna" value={total} icon={Users} onClick={() => { setStatusFilter(""); setRoleFilter(""); setPage(1); }} />
                <StatCard label="Aktif" value={users.filter(u => u.status === "ACTIVE").length} icon={Activity} onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }} />
                <StatCard label="Pending" value={users.filter(u => u.status === "PENDING").length} icon={Clock} onClick={() => { setStatusFilter("PENDING"); setPage(1); }} />
                <StatCard label="Ditangguhkan" value={users.filter(u => u.status === "SUSPENDED").length} icon={ShieldAlert} onClick={() => { setStatusFilter("SUSPENDED"); setPage(1); }} />
            </StatsGrid>

            {/* Enterprise Table Container */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
                
                {/* Quick Tabs */}
                <div className="flex items-center gap-6 px-5 pt-3 border-b border-gray-200 bg-gray-50/50 overflow-x-auto scrollbar-none">
                    <button onClick={() => { setStatusFilter(""); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700")}>Semua Pengguna</button>
                    <button onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "ACTIVE" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>Aktif</button>
                    <button onClick={() => { setStatusFilter("PENDING"); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "PENDING" ? "border-amber-500 text-amber-700" : "border-transparent text-gray-500 hover:text-gray-700")}>Menunggu</button>
                    <button onClick={() => { setStatusFilter("SUSPENDED"); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "SUSPENDED" ? "border-gray-500 text-gray-700" : "border-transparent text-gray-500 hover:text-gray-700")}>Ditangguhkan</button>
                </div>

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
                                placeholder="Cari email atau id..."
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
                                    onClick={() => { if (selected.size === 1) setDeleteTargetId([...selected][0]); }}
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

                        {/* Filter Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={cn("flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-semibold transition-all outline-none", hasFilters ? "bg-black border-black text-white shadow-md" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300")}>
                                    <Filter className="w-4 h-4" />
                                    Filter
                                    {hasFilters && <span className="flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-white/20 text-[10px] font-black">{[roleFilter, statusFilter].filter(Boolean).length}</span>}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                                <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Berdasarkan Role</DropdownMenuLabel>
                                {ROLES.map(r => (
                                    <DropdownMenuCheckboxItem 
                                        key={r.value} 
                                        checked={roleFilter === r.value}
                                        onCheckedChange={() => { setRoleFilter(r.value === roleFilter ? "" : r.value); setPage(1); }}
                                        className="font-medium cursor-pointer rounded-md"
                                    >
                                        {r.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                <DropdownMenuSeparator className="my-2 bg-gray-100" />
                                <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Berdasarkan Status</DropdownMenuLabel>
                                {STATUSES.map(s => (
                                    <DropdownMenuCheckboxItem 
                                        key={s} 
                                        checked={statusFilter === s}
                                        onCheckedChange={() => { setStatusFilter(s === statusFilter ? "" : s); setPage(1); }}
                                        className="font-medium cursor-pointer rounded-md"
                                    >
                                        {s === "ACTIVE" ? "Aktif" : s === "PENDING" ? "Pending" : s === "SUSPENDED" ? "Ditangguhkan" : "Ditolak"}
                                    </DropdownMenuCheckboxItem>
                                ))}
                                {hasFilters && (
                                    <>
                                        <DropdownMenuSeparator className="my-2 bg-gray-100" />
                                        <DropdownMenuItem onClick={() => { setRoleFilter(""); setStatusFilter(""); setPage(1); }} className="justify-center text-red-600 font-bold hover:bg-red-50 hover:text-red-700 cursor-pointer rounded-md">
                                            Reset Filter
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

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

                        <button onClick={fetchUsers} className="p-2.5 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all" title="Segarkan Data">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-black' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Table Area (Scrollable with sticky header) */}
                <div className="overflow-x-auto relative max-h-[600px]">
                    <table className="w-full text-sm min-w-[720px] text-left border-collapse">
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
                                <SortTh label="Pengguna" col="email" />
                                <SortTh label="Role" col="role" />
                                <SortTh label="Status" col="status" />
                                <SortTh label="Aktivitas" col="last_login" />
                                <SortTh label="Bergabung" col="created_at" className="text-right" />
                                <th className="w-14 pr-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 right-0 z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: limit }).map((_, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className={`pl-5 ${pyClass}`}><div className="w-4 h-4 rounded border border-gray-100 bg-gray-50 animate-pulse" /></td>
                                        {visibleCols.has("email") && <td className={`px-5 ${pyClass}`}><div className="space-y-2"><div className="h-4 w-48 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-32 bg-gray-50 rounded animate-pulse" /></div></td>}
                                        {visibleCols.has("role") && <td className={`px-5 ${pyClass}`}><div className="h-6 w-24 bg-gray-100 rounded-lg animate-pulse" /></td>}
                                        {visibleCols.has("status") && <td className={`px-5 ${pyClass}`}><div className="h-6 w-20 bg-gray-100 rounded-lg animate-pulse" /></td>}
                                        {visibleCols.has("last_login") && <td className={`px-5 ${pyClass}`}><div className="h-4 w-20 bg-gray-100 rounded animate-pulse" /></td>}
                                        {visibleCols.has("created_at") && <td className={`px-5 ${pyClass}`}><div className="flex flex-col items-end space-y-2"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-16 bg-gray-50 rounded animate-pulse" /></div></td>}
                                        <td className={`pr-5 ${pyClass} text-right sticky right-0 bg-white shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]`}><div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={visibleCols.size + 2} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Search className="w-10 h-10 mb-4 opacity-20" />
                                            <p className="text-base font-semibold text-gray-700 mb-1">{search || hasFilters ? "Tidak ada pengguna yang cocok" : "Belum ada data pengguna"}</p>
                                            <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => {
                                    const isSelected = selected.has(user.user_id);
                                    const roleCfg = ROLE_COLORS[user.role] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                                    const statusCfg = STATUS_CFG[user.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.SUSPENDED;
                                    
                                    return (
                                        <tr key={user.user_id} className={cn("group transition-colors", isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/80")}>
                                            <td className={`pl-5 ${pyClass}`}>
                                                <button
                                                    onClick={() => toggleRow(user.user_id)}
                                                    className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 group-hover:border-gray-400 bg-white")}
                                                >
                                                    {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                                </button>
                                            </td>
                                            
                                            {visibleCols.has("email") && (
                                                <td className={`px-5 ${pyClass}`}>
                                                    <div className="min-w-0 flex items-center">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 truncate max-w-[240px] leading-snug">{user.email}</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <p className="text-[11px] font-medium text-gray-500 font-mono truncate max-w-[160px]">{user.user_id}</p>
                                                                <CopyButton text={user.user_id} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            
                                            {visibleCols.has("role") && (
                                                <td className={`px-5 ${pyClass}`}>
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold", roleCfg.bg, roleCfg.text)}>
                                                        <ShieldAlert className="w-3.5 h-3.5 opacity-60" />
                                                        {fmtRole(user.role)}
                                                    </span>
                                                </td>
                                            )}
                                            
                                            {visibleCols.has("status") && (
                                                <td className={`px-5 ${pyClass}`}>
                                                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold bg-white", statusCfg.text, statusCfg.ring)}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                        {user.status === "ACTIVE" ? "Aktif" : user.status === "PENDING" ? "Pending" : user.status === "SUSPENDED" ? "Ditangguhkan" : "Ditolak"}
                                                    </div>
                                                </td>
                                            )}

                                            {visibleCols.has("last_login") && (
                                                <td className={`px-5 ${pyClass}`}>
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Key className="w-3.5 h-3.5 opacity-50" />
                                                        <span className="text-sm font-medium">{user.last_login ? fmtDate(user.last_login) : "Belum pernah"}</span>
                                                    </div>
                                                </td>
                                            )}
                                            
                                            {visibleCols.has("created_at") && (
                                                <td className={`px-5 ${pyClass} text-right`}>
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-sm font-semibold text-gray-900">{fmtDate(user.created_at)}</span>
                                                        <span className="text-[11px] font-medium text-gray-500">{fmtRelative(user.created_at)}</span>
                                                    </div>
                                                </td>
                                            )}
                                            
                                            {/* Enterprise Sticky Actions Column */}
                                            <td className={cn(`pr-5 ${pyClass} text-right sticky right-0 z-0 transition-colors`, isSelected ? "bg-blue-50/40" : "bg-white group-hover:bg-gray-50/80", "shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]")}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setEditUser(user)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors outline-none" title="Edit Pengguna">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => setDeleteTargetId(user.user_id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors outline-none" title="Hapus Pengguna">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors outline-none">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-lg border-gray-100">
                                                            <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(user.user_id); toast({description: "ID disalin ke clipboard"}); }} className="cursor-pointer font-medium rounded-lg py-2">
                                                                <Copy className="w-4 h-4 mr-2 text-gray-500" /> Salin ID Pengguna
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
                            {loading ? "Memuat…" : `${users.length} dari total ${total.toLocaleString()} pengguna`}
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

            {/* Modals */}
            {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />}
            {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} onCreated={fetchUsers} />}
            <ActionModal
                open={deleteTargetId !== null}
                onOpenChange={open => { if (!open) setDeleteTargetId(null); }}
                title="Hapus Pengguna"
                description="Apakah Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus"
                cancelText="Batal"
                destructive
                onConfirm={async () => {
                    if (!deleteTargetId) return;
                    await handleDelete(deleteTargetId);
                    setDeleteTargetId(null);
                    setSelected(new Set());
                }}
            />
        </PageShell>
    );
}

// FORCE_REFRESH_TRIGGER: 4

