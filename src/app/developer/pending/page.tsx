"use client";

import { useEffect, useState, useRef } from "react";
import {
    CheckCircle2, Loader2, AlertCircle, Search, X,
    ChevronsUpDown, ChevronUp, ChevronDown, ArrowRight, RefreshCw,
} from "lucide-react";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

type PendingUser = {
    user_id: string;
    email: string;
    role: string;
    created_at: string;
    full_name?: string;
    nik?: string;
    phone_number?: string;
    address?: string;
    birth_date?: string;
    gender?: string;
    ktp_image_path?: string;
    selfie_image_path?: string;
};

const getImagePath = (path: string | undefined) => {
    if (!path) return null;
    if (path.startsWith("public/")) return "/" + path.substring(7);
    return path;
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
    return `${Math.floor(h / 24)}h lalu`;
}

type SortCol = "email" | "full_name" | "created_at";

export default function PendingApprovalsPage() {
    const [pending, setPending] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [sortBy, setSortBy] = useState<SortCol>("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [declineLoading, setDeclineLoading] = useState(false);
    const { toast } = useToast();
    const searchRef = useRef<HTMLInputElement>(null);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/developer/pending");
            const data = await res.json();
            if (res.ok) setPending(data.pending || []);
            else toast({ title: "Error", description: "Failed to load pending users", variant: "destructive" });
        } catch {
            toast({ title: "Error", description: "Failed to load pending users", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPending(); }, []);
    useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

    const handleApprove = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/developer/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.user_id }),
            });
            if (res.ok) {
                toast({ title: "Success", description: "User approved successfully" });
                setIsDetailOpen(false);
                fetchPending();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to approve user", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to approve user", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDecline = async () => {
        if (!selectedUser) return;
        if (!confirm("Are you sure you want to decline this user? This action cannot be undone.")) return;
        setDeclineLoading(true);
        try {
            const res = await fetch("/api/developer/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.user_id }),
            });
            if (res.ok) {
                toast({ title: "User Declined", description: "User has been rejected." });
                setIsDetailOpen(false);
                fetchPending();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to decline user", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Failed to decline user", variant: "destructive" });
        } finally {
            setDeclineLoading(false);
        }
    };

    const filteredPending = pending.filter(u => u.ktp_image_path && u.selfie_image_path);

    const toggleSort = (col: SortCol) => {
        if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
        else { setSortBy(col); setSortOrder("asc"); }
    };

    const displayed = [...filteredPending]
        .filter(u => {
            if (!search) return true;
            const q = search.toLowerCase();
            return u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
        })
        .sort((a, b) => {
            const av = (a[sortBy] ?? "") as string;
            const bv = (b[sortBy] ?? "") as string;
            return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });

    function SortTh({ label, col, className = "" }: { label: string; col: SortCol; className?: string }) {
        const active = sortBy === col;
        return (
            <th
                onClick={() => toggleSort(col)}
                className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? "text-gray-800" : "text-gray-400 hover:text-gray-600"} ${className}`}
            >
                <span className="inline-flex items-center gap-1">
                    {label}
                    {active ? (
                        sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                </span>
            </th>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight text-black">Pending Approvals</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Review and approve new user registrations with uploaded documents.
                </p>
            </div>

            {/* Deprecation banner */}
            <div className="rounded-md border border-amber-200 bg-white px-4 py-3 flex gap-3 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-semibold text-amber-900">Halaman ini akan dipensiunkan.</p>
                    <p className="text-amber-800 mt-0.5">
                        Approval per-agen sekarang ditangani admin agency lewat invitation flow di{" "}
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/admin-agency/team</span>.
                        Halaman ini hanya untuk membersihkan akun-akun lama yang masih berstatus PENDING.
                    </p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-black">Menunggu Persetujuan</span>
                        <span className="bg-gray-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                            {filteredPending.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 transition-all">
                            <button
                                onClick={() => { if (searchOpen) { setSearchOpen(false); setSearch(""); } else setSearchOpen(true); }}
                                className="p-0.5 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-200 ${searchOpen ? "w-44" : "w-0"}`}>
                                <input
                                    ref={searchRef}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }}
                                    placeholder="Cari email atau nama…"
                                    className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1"
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => { setLoading(true); fetchPending(); }}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
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
                                <SortTh label="User" col="email" className="text-left" />
                                <SortTh label="Full Name" col="full_name" className="text-left" />
                                <th className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">
                                    Role
                                </th>
                                <SortTh label="Submitted" col="created_at" className="text-right" />
                                <th className="w-12 pr-5 py-3.5" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-5 py-4">
                                            <div className="h-3.5 w-44 bg-gray-100 rounded animate-pulse" />
                                        </td>
                                        <td className="px-5 py-4"><div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" /></td>
                                        <td className="px-5 py-4"><div className="h-5 w-16 bg-gray-100 rounded-lg animate-pulse" /></td>
                                        <td className="px-5 py-4 text-right"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse ml-auto" /></td>
                                        <td className="w-12 pr-5 py-4" />
                                    </tr>
                                ))
                            ) : displayed.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                                        {search ? `No results for "${search}"` : "No pending approvals with documents found."}
                                    </td>
                                </tr>
                            ) : (
                                displayed.map(user => {
                                    return (
                                        <tr
                                            key={user.user_id}
                                            className="border-b border-gray-50 hover:bg-white transition-colors group/row"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-black truncate max-w-[220px]">{user.email}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-700">{user.full_name || "—"}</span>
                                                    <div className="w-4 h-4 bg-gray-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0" title="Documents Uploaded">
                                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 capitalize">
                                                    {user.role.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-xs font-medium text-gray-700">{fmtDate(user.created_at)}</span>
                                                    <span className="text-[10px] text-gray-400">{relDate(user.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="w-24 pr-5 py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedUser(user); setIsDetailOpen(true); }}
                                                    className="opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-gray-800"
                                                >
                                                    Review <ArrowRight className="h-3 w-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                        {loading ? "Loading…" : `${displayed.length} pengguna menunggu persetujuan`}
                    </p>
                </div>

            </div>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>User Registration Details</DialogTitle>
                        <DialogDescription>
                            Review the user&apos;s submitted information before approving.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {selectedUser && (
                            <div className="grid gap-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
                                    {[
                                        { label: "Email", value: selectedUser.email },
                                        { label: "Role", value: <span className="capitalize">{selectedUser.role}</span> },
                                        { label: "Full Name", value: selectedUser.full_name || "—" },
                                        { label: "NIK", value: selectedUser.nik || "—" },
                                        { label: "Phone Number", value: selectedUser.phone_number || "—" },
                                        { label: "Gender", value: selectedUser.gender || "—" },
                                        { label: "Birth Date", value: selectedUser.birth_date || "—" },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="space-y-1">
                                            <span className="text-sm font-medium text-muted-foreground">{label}</span>
                                            <p className="text-sm font-semibold">{value}</p>
                                        </div>
                                    ))}
                                    <div className="sm:col-span-2 space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Address</span>
                                        <p className="text-sm font-semibold">{selectedUser.address || "—"}</p>
                                    </div>
                                </div>

                                {(selectedUser.ktp_image_path || selectedUser.selfie_image_path) && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Verification Documents</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {selectedUser.ktp_image_path && (
                                                <div className="space-y-2">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase">KTP Photo</span>
                                                    <div className="border rounded-md overflow-hidden bg-muted/20 aspect-video relative group">
                                                        <Image
                                                            src={getImagePath(selectedUser.ktp_image_path)!}
                                                            alt="KTP"
                                                            fill
                                                            className="object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(getImagePath(selectedUser.ktp_image_path)!, "_blank")}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to View</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedUser.selfie_image_path && (
                                                <div className="space-y-2">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase">Selfie with KTP</span>
                                                    <div className="border rounded-md overflow-hidden bg-muted/20 aspect-video relative group">
                                                        <Image
                                                            src={getImagePath(selectedUser.selfie_image_path)!}
                                                            alt="Selfie"
                                                            fill
                                                            className="object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(getImagePath(selectedUser.selfie_image_path)!, "_blank")}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to View</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4 p-6 pt-4 border-t bg-background sticky bottom-0 z-10">
                        <Button
                            variant="destructive"
                            onClick={handleDecline}
                            disabled={declineLoading || actionLoading}
                            className="w-full sm:w-auto"
                        >
                            {declineLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Declining...</> : "Decline User"}
                        </Button>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                            <LiquidButton onClick={handleApprove} disabled={actionLoading || declineLoading}>
                                {actionLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</>
                                ) : (
                                    <><CheckCircle2 className="mr-2 h-4 w-4" />Approve User</>
                                )}
                            </LiquidButton>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
