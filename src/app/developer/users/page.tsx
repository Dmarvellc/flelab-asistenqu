"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Search, RefreshCw, ChevronLeft, ChevronRight,
    ChevronsUpDown, ChevronUp, ChevronDown,
    Edit, Trash2, UserPlus, Loader2, Copy, Check, X,
    Users, Activity, Clock, ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ActionModal } from "@/components/ui/action-modal";
import { useBusy } from "@/components/ui/busy-overlay-provider";

/* ─── Types ──────────────────────────────────────────────────────── */
type User = {
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
};

/* ─── Helpers ────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-violet-100", text: "text-violet-700" },
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-teal-100", text: "text-teal-700" },
    { bg: "bg-cyan-100", text: "text-cyan-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function avatarColor(email: string) {
    const code = [...email].reduce((s, c) => s + c.charCodeAt(0), 0);
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    agent: { bg: "bg-blue-50", text: "text-blue-700" },
    admin_agency: { bg: "bg-violet-50", text: "text-violet-700" },
    hospital_admin: { bg: "bg-teal-50", text: "text-teal-700" },
    insurance_admin: { bg: "bg-amber-50", text: "text-amber-700" },
    developer: { bg: "bg-gray-900", text: "text-white" },
    super_admin: { bg: "bg-gray-100", text: "text-gray-700" },
};

const STATUS_CFG = {
    ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", ring: "ring-emerald-200" },
    PENDING: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", ring: "ring-amber-200" },
    REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", ring: "ring-red-200" },
    SUSPENDED: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", ring: "ring-gray-200" },
} as const;

const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"] as const;

function fmtRole(r: string) {
    return r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
    return (
        <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100 transition-colors">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
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
            if (res.ok) { toast({ title: "Saved", description: "User updated successfully" }); onSaved(); onClose(); }
            else toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Edit User</h3>
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all">
                            <option value="agent">Agent</option>
                            <option value="admin_agency">Agency Admin</option>
                            <option value="hospital_admin">Hospital Admin</option>
                            <option value="insurance_admin">Insurance Admin</option>
                            <option value="developer">Developer</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all">
                            <option value="ACTIVE">Active</option>
                            <option value="PENDING">Pending</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 pt-1">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save Changes
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
            if (res.ok) { toast({ title: "Created", description: "User created successfully" }); onCreated(); onClose(); }
            else toast({ title: "Error", description: data.error || "Failed to create user", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Add New User</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Create a new platform account</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all">
                            <option value="agent">Agent</option>
                            <option value="admin_agency">Agency Admin</option>
                            <option value="hospital_admin">Hospital Admin</option>
                            <option value="insurance_admin">Insurance Admin</option>
                            <option value="developer">Developer</option>
                        </select>
                    </div>
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Password</label>
                            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                        </div>
                    </div>
                    {needsProfile && (
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profile Details</p>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Full Name</label>
                                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Phone</label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+62812..." className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all" />
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Create User
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
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

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
            const params = new URLSearchParams({ page: page.toString(), limit: "15", search, sortBy, sortOrder });
            if (roleFilter) params.set("role", roleFilter);
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/users?${params}`);
            const data = await res.json();
            if (res.ok) { setUsers(data.data); setTotalPages(data.meta.totalPages); setTotal(data.meta.total); }
        } catch {
            toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
        } finally { setLoading(false); }
    }, [page, search, sortBy, sortOrder, roleFilter, statusFilter, toast]);

    useEffect(() => { const t = setTimeout(fetchUsers, 400); return () => clearTimeout(t); }, [fetchUsers]);
    useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

    const handleDelete = async (userId: string) => {
        await run(async () => {
            try {
                const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
                const body = await res.json().catch(() => ({} as Record<string, unknown>));
                if (res.ok) {
                    const msg = (body as { message?: string }).message ?? "User berhasil dihapus";
                    toast({ title: (body as { softDeleted?: boolean }).softDeleted ? "User di-suspend" : "Deleted", description: msg });
                    fetchUsers();
                } else {
                    toast({ title: "Error", description: (body as { error?: string }).error ?? "Gagal menghapus user", variant: "destructive" });
                }
            } catch (e) {
                toast({ title: "Error", description: e instanceof Error ? e.message : "Gagal menghapus user", variant: "destructive" });
            }
        }, "Menghapus user…");
    };

    const toggleSort = (col: string) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
        setPage(1);
    };

    const allIds = users.map(u => u.user_id);
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));
    const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
    const toggleRow = (id: string) => setSelected(prev => {
        const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
    });

    function SortTh({ label, col, className = "" }: { label: string; col: string; className?: string }) {
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

    const ROLES = [
        { value: "agent", label: "Agent" },
        { value: "admin_agency", label: "Agency Admin" },
        { value: "hospital_admin", label: "Hospital Admin" },
        { value: "insurance_admin", label: "Insurance Admin" },
        { value: "developer", label: "Developer" },
    ];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">User Management</h1>
                        <p className="text-sm text-gray-400">{total.toLocaleString()} users on platform</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all shadow-sm"
                >
                    <UserPlus className="h-4 w-4" />
                    Add User
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Users", value: total, icon: Users, color: "text-gray-900", onClick: () => { setStatusFilter(""); setRoleFilter(""); setPage(1); } },
                    { label: "Active", value: users.filter(u => u.status === "ACTIVE").length, icon: Activity, color: "text-emerald-600", onClick: () => { setStatusFilter("ACTIVE"); setPage(1); } },
                    { label: "Pending", value: users.filter(u => u.status === "PENDING").length, icon: Clock, color: "text-amber-600", onClick: () => { setStatusFilter("PENDING"); setPage(1); } },
                    { label: "Suspended", value: users.filter(u => u.status === "SUSPENDED").length, icon: ShieldAlert, color: "text-red-500", onClick: () => { setStatusFilter("SUSPENDED"); setPage(1); } },
                ].map(({ label, value, icon: Icon, color, onClick }) => (
                    <button key={label} onClick={onClick} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-gray-200 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
                            <Icon className={`h-4 w-4 ${color} group-hover:scale-110 transition-transform`} />
                        </div>
                        {loading
                            ? <div className="h-8 w-12 bg-gray-100 rounded-lg animate-pulse" />
                            : <p className={`text-3xl font-black tracking-tight ${color}`}>{value.toLocaleString()}</p>
                        }
                    </button>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {someSelected ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-150">
                                <span className="text-sm font-semibold text-gray-700">{selected.size} dipilih</span>
                                <button
                                    onClick={() => { if (selected.size === 1) setDeleteTargetId([...selected][0]); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-all border border-red-200"
                                >
                                    <Trash2 className="h-3 w-3" /> Hapus
                                </button>
                                <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                                    Batal
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm font-bold text-gray-900">Users</span>
                                <span className="bg-gray-100 text-gray-500 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">{total}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Role filter */}
                        <select
                            value={roleFilter}
                            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                            className={`text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${roleFilter ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                        >
                            <option value="">All Roles</option>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                        {/* Expandable search */}
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
                                    placeholder="Cari email atau role…"
                                    className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1"
                                />
                            </div>
                        </div>
                        <button onClick={() => { setLoading(true); fetchUsers(); }} className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Status filter chips */}
                <div className="px-5 py-2.5 border-b border-gray-50 flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => { setStatusFilter(""); setPage(1); }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${!statusFilter ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                    >
                        Semua
                    </button>
                    {STATUSES.map(s => {
                        const cfg = STATUS_CFG[s];
                        const active = statusFilter === s;
                        return (
                            <button
                                key={s}
                                onClick={() => { setStatusFilter(active ? "" : s); setPage(1); }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${active ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}` : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {s}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
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
                                <SortTh label="User" col="email" className="text-left" />
                                <SortTh label="Role" col="role" className="text-left" />
                                <SortTh label="Status" col="status" className="text-left" />
                                <SortTh label="Joined" col="created_at" className="text-right" />
                                <th className="w-28 pr-5 py-3.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="w-10 pl-5 py-4"><div className="w-[15px] h-[15px] rounded-[3px] bg-gray-100 animate-pulse" /></td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                                                <div className="space-y-1.5">
                                                    <div className="h-3.5 w-44 bg-gray-100 rounded animate-pulse" />
                                                    <div className="h-2.5 w-28 bg-gray-100 rounded animate-pulse" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4"><div className="h-5 w-20 bg-gray-100 rounded-lg animate-pulse" /></td>
                                        <td className="px-5 py-4"><div className="h-5 w-16 bg-gray-100 rounded-lg animate-pulse" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="w-28 pr-5 py-4" />
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {search || roleFilter || statusFilter ? "No users match your filters" : "No users found"}
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => {
                                    const av = avatarColor(user.email);
                                    const isSelected = selected.has(user.user_id);
                                    const roleCfg = ROLE_COLORS[user.role] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                                    const statusCfg = STATUS_CFG[user.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.SUSPENDED;
                                    return (
                                        <tr
                                            key={user.user_id}
                                            className={`border-b border-gray-50 group/row transition-colors ${isSelected ? "bg-gray-50/70" : "hover:bg-gray-50/50"}`}
                                        >
                                            <td className="w-10 pl-5 py-4">
                                                <button
                                                    onClick={() => toggleRow(user.user_id)}
                                                    className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center transition-all ${isSelected ? "bg-gray-900 border-gray-900" : "border-gray-300 opacity-0 group-hover/row:opacity-100 hover:border-gray-500"}`}
                                                >
                                                    {isSelected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${av.bg} ${av.text}`}>
                                                        {user.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[220px]">{user.email}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <p className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">{user.user_id}</p>
                                                            <CopyButton text={user.user_id} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${roleCfg.bg} ${roleCfg.text}`}>
                                                    {fmtRole(user.role)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-xs font-medium text-gray-700">{fmtDate(user.created_at)}</span>
                                                    <span className="text-[10px] text-gray-400">{fmtRelative(user.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="w-28 pr-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150">
                                                    <button
                                                        onClick={() => setEditUser(user)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-3.5 w-3.5 text-gray-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTargetId(user.user_id)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete"
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

                {/* Footer + Pagination */}
                <div className="px-5 py-3.5 border-t border-gray-50 flex items-center justify-between gap-4">
                    <p className="text-xs text-gray-400">
                        {loading ? "Loading…" : `${users.length} dari ${total.toLocaleString()} users · Page ${page} of ${totalPages}`}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200">
                            <ChevronLeft className="h-3 w-3" /> Prev
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                if (p < 1 || p > totalPages) return null;
                                return (
                                    <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === page ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-gray-200">
                            Next <ChevronRight className="h-3 w-3" />
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
                title="Delete User"
                description="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Yes, Delete"
                cancelText="Cancel"
                destructive
                onConfirm={async () => {
                    if (!deleteTargetId) return;
                    await handleDelete(deleteTargetId);
                    setDeleteTargetId(null);
                    setSelected(new Set());
                }}
            />
        </div>
    );
}
