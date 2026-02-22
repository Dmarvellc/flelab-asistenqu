"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, MoreHorizontal, ArrowUpRight, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
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
        icon: <Clock className="h-4 w-4" />,
    },
    SUBMITTED: {
        label: "Diajukan",
        icon: <AlertCircle className="h-4 w-4" />,
    },
    APPROVED: {
        label: "Disetujui",
        icon: <CheckCircle2 className="h-4 w-4" />,
    },
    REJECTED: {
        label: "Ditolak",
        icon: <XCircle className="h-4 w-4" />,
    },
    PAID: {
        label: "Dibayar",
        icon: <DollarSign className="h-4 w-4" />,
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
        <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                    <p className="text-[15px] font-semibold text-gray-500 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {claims.length} Total Klaim
                    </p>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mt-2">Daftar Klaim</h1>
                    <p className="mt-1 text-base text-gray-500">Kelola dan pantau pengajuan klaim asuransi klien Anda di satu tempat terpadu.</p>
                </div>
                <Link href="/agent/claims/new">
                    <button className="bg-gray-900 hover:bg-black text-white text-[15px] font-semibold h-12 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Buat Klaim Baru
                    </button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                    <p className="text-4xl font-bold tabular-nums text-gray-900 tracking-tight">{claims.length}</p>
                    <p className="text-[15px] font-medium text-gray-500 mt-2">Total Klaim</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                    <p className="text-4xl font-bold tabular-nums text-gray-900 tracking-tight">{statusCounts['APPROVED'] || 0}</p>
                    <p className="text-[15px] font-medium text-gray-500 mt-2">Disetujui</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300 col-span-2 md:col-span-1">
                    <p className="text-4xl font-bold tabular-nums text-gray-900 tracking-tight">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(totalAmount)}
                    </p>
                    <p className="text-[15px] font-medium text-gray-500 mt-2">Total Nilai Klaim</p>
                </div>
            </div>

            {/* Table wrapper */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-6 p-8 border-b border-gray-50 bg-gray-50/30">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="search"
                            placeholder="Cari nasabah, RS, atau penyakit..."
                            className="pl-12 h-12 bg-white border-gray-200 text-[15px] rounded-2xl focus:bg-white focus:border-gray-300 focus:ring-4 focus:ring-gray-900/5 transition-all w-full shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {/* Status filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveFilter(null)}
                            className={cn(
                                "text-[14px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm border",
                                !activeFilter ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
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
                                        "text-[14px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm border",
                                        activeFilter === f ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {statusConfig[f]?.label || f} ({statusCounts[f]})
                                </button>
                            ) : null
                        ))}
                    </div>
                </div>

                {/* Content List */}
                <div className="p-4 sm:p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-6">
                            <div className="h-12 w-12 rounded-full border-[3px] border-gray-100 border-t-gray-900 animate-spin" />
                            <p className="text-base font-medium text-gray-400">Memuat data klaim...</p>
                        </div>
                    ) : filteredClaims.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center text-gray-500 bg-gray-50/50 rounded-[24px] border border-gray-100/50 m-4">
                            <div className="h-20 w-20 rounded-[24px] bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
                                <FileText className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 mb-2">Tidak ada klaim</p>
                            <p className="text-base text-gray-500 max-w-sm mx-auto leading-relaxed">
                                {search || activeFilter ? "Maaf, tidak ada klaim yang cocok dengan filter atau pencarian Anda." : "Anda belum memiliki riwayat pengajuan klaim."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredClaims.map((claim) => {
                                const cfg = statusConfig[claim.status] || { label: claim.status, icon: null };
                                return (
                                    <div
                                        key={claim.claim_id}
                                        className="group flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl transition-all duration-300"
                                    >
                                        <div className="flex flex-col gap-3 flex-1 min-w-0 pr-6">
                                            <div className="flex items-center justify-between lg:justify-start gap-4 flex-wrap w-full">
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-gray-900 text-lg">{claim.client_name}</h3>
                                                    <span className="font-mono text-[13px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                                                        #{claim.claim_number || claim.claim_id.slice(0, 8)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-[13px] font-bold px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 shadow-sm w-max lg:ml-auto">
                                                    {cfg.icon}
                                                    <span className={cn(
                                                        claim.status === 'APPROVED' || claim.status === 'PAID' ? "text-gray-900" :
                                                            claim.status === 'REJECTED' ? "text-red-700" :
                                                                claim.status === 'SUBMITTED' ? "text-gray-800" :
                                                                    "text-gray-600"
                                                    )}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-gray-500 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-gray-700">{claim.hospital_name || 'Rumah Sakit Tidak Diketahui'}</span>
                                                </div>
                                                <span className="text-gray-300 hidden sm:inline">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span>
                                                        {new Date(claim.claim_date).toLocaleDateString("id-ID", {
                                                            day: 'numeric', month: 'long', year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                <span className="text-gray-300 hidden sm:inline">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 shadow-sm">
                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claim.total_amount || 0)}
                                                    </span>
                                                </div>
                                                {claim.disease_name && (
                                                    <>
                                                        <span className="text-gray-300 hidden sm:inline">•</span>
                                                        <span className="truncate max-w-[200px] text-gray-600">{claim.disease_name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Link
                                            href={`/agent/claims/${claim.claim_id}`}
                                            className="mt-6 lg:mt-0 lg:ml-6 shrink-0 inline-flex items-center justify-center gap-2 text-[14px] font-bold text-gray-900 border border-gray-200 hover:border-gray-900 bg-white hover:bg-gray-50 px-6 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full lg:w-max group-hover:-translate-y-0.5"
                                        >
                                            Lihat Detail
                                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {!loading && filteredClaims.length > 0 && (
                    <div className="px-8 py-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-gray-500">
                            Menampilkan {filteredClaims.length} dari {claims.length} total klaim
                        </p>
                        <p className="text-[14px] font-bold text-gray-900">
                            Total Estimasi: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                                filteredClaims.reduce((s, c) => s + (c.total_amount || 0), 0)
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
