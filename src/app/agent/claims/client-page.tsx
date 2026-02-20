"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, MoreHorizontal, ArrowUpRight, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Claim = {
    claim_id: string;
    claim_number: string | null;
    client_name: string;
    hospital_name: string;
    disease_name: string;
    status: string;
    stage: string | null;
    total_amount: number;
    claim_date: string;
    log_number: string | null;
    log_issued_at: string | null;
    log_sent_to_hospital_at: string | null;
};

const statusConfig: Record<string, {
    label: string;
    icon: React.ReactNode;
}> = {
    DRAFT: {
        label: "Draft",
        icon: <Clock className="h-3.5 w-3.5" />,
    },
    SUBMITTED: {
        label: "Diajukan",
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    APPROVED: {
        label: "Disetujui",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    REJECTED: {
        label: "Ditolak",
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    PAID: {
        label: "Dibayar",
        icon: <DollarSign className="h-3.5 w-3.5" />,
    },
};

export default function AgentClaimsPage({ initialClaims }: { initialClaims: Claim[] }) {
    const [claims, setClaims] = useState<Claim[]>(initialClaims || []);
    const [loading, setLoading] = useState(!initialClaims);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    useEffect(() => {
        if (initialClaims) return;
        const fetchClaims = async () => {
            try {
                const res = await fetch("/api/agent/claims");
                const data = await res.json();
                if (res.ok) {
                    setClaims(data.claims || []);
                }
            } catch (error) {
                console.error("Failed to fetch claims", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClaims();
    }, [initialClaims]);

    const filteredClaims = claims.filter(claim => {
        const matchesSearch =
            claim.client_name.toLowerCase().includes(search.toLowerCase()) ||
            claim.hospital_name?.toLowerCase().includes(search.toLowerCase()) ||
            claim.disease_name?.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = !activeFilter || claim.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const statusCounts = claims.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalAmount = claims.reduce((s, c) => s + (c.total_amount || 0), 0);

    const filters = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'];

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                        <FileText className="h-3 w-3" />
                        <span>{claims.length} Total Klaim</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Daftar Klaim</h1>
                    <p className="mt-1 text-sm text-gray-500">Kelola pengajuan klaim asuransi nasabah Anda.</p>
                </div>
                <Link href="/agent/claims/new">
                    <Button className="bg-black hover:bg-gray-900 text-white gap-2 shadow-sm hover:shadow-md transition-all duration-200">
                        <Plus className="h-4 w-4" />
                        Buat Klaim Baru
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{claims.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Klaim</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{statusCounts['APPROVED'] || 0}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Disetujui</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 col-span-2 sm:col-span-1">
                    <p className="text-2xl font-bold tabular-nums text-gray-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Nilai Klaim</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder="Cari nasabah, RS, atau penyakit..."
                            className="pl-10 bg-gray-50 border-gray-100 text-sm rounded-xl focus:bg-white transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Status filters */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            onClick={() => setActiveFilter(null)}
                            className={cn(
                                "text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150",
                                !activeFilter ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                            )}
                        >
                            Semua
                        </button>
                        {filters.map(f => (
                            statusCounts[f] ? (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(activeFilter === f ? null : f)}
                                    className={cn(
                                        "text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150",
                                        activeFilter === f ? "bg-black text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    )}
                                >
                                    {statusConfig[f]?.label || f} ({statusCounts[f]})
                                </button>
                            ) : null
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="p-4 sm:p-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                            <p className="text-sm text-gray-400">Memuat data klaim...</p>
                        </div>
                    ) : filteredClaims.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                                <FileText className="h-7 w-7 text-gray-300" />
                            </div>
                            <p className="text-base font-semibold text-gray-700">Tidak ada klaim</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {search || activeFilter ? "Tidak ada klaim yang cocok dengan filter." : "Belum ada klaim."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredClaims.map((claim) => {
                                const cfg = statusConfig[claim.status] || { label: claim.status, icon: null };
                                return (
                                    <div
                                        key={claim.claim_id}
                                        className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 rounded-xl transition-all duration-200"
                                    >
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-bold text-gray-900 text-[15px]">{claim.client_name}</h3>
                                                <span className="font-mono text-xs tracking-wide text-gray-400">
                                                    #{claim.claim_number || claim.claim_id.slice(0, 8)}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                                    {cfg.icon}
                                                    <span className={cn(
                                                        claim.status === 'APPROVED' || claim.status === 'PAID' ? "text-black" :
                                                            claim.status === 'REJECTED' ? "text-gray-900" :
                                                                claim.status === 'SUBMITTED' ? "text-gray-800" :
                                                                    "text-gray-500"
                                                    )}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500 mt-1">
                                                <span className="truncate max-w-[200px] font-medium text-gray-700">{claim.hospital_name || '—'}</span>
                                                <span className="text-gray-300">•</span>
                                                <span>
                                                    {new Date(claim.claim_date).toLocaleDateString("id-ID", {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="font-semibold text-gray-900">
                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claim.total_amount || 0)}
                                                </span>
                                                {claim.disease_name && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="truncate max-w-[150px]">{claim.disease_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Link
                                            href={`/agent/claims/${claim.claim_id}`}
                                            className="shrink-0 flex items-center gap-1 text-[13px] font-semibold text-gray-400 hover:text-black mt-3 sm:mt-0 sm:ml-4 group-hover:text-black transition-colors duration-200"
                                        >
                                            Lihat Detail
                                            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!loading && filteredClaims.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            Menampilkan {filteredClaims.length} dari {claims.length} klaim
                        </p>
                        <p className="text-xs text-gray-400">
                            Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                                filteredClaims.reduce((s, c) => s + (c.total_amount || 0), 0)
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
