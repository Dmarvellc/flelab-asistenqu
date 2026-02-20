"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, MoreHorizontal, ArrowUpRight, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign } from "lucide-react";
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
    client_name: string;
    hospital_name: string;
    disease_name: string;
    status: string;
    total_amount: number;
    claim_date: string;
};

const statusConfig: Record<string, {
    label: string;
    icon: React.ReactNode;
    className: string;
}> = {
    DRAFT: {
        label: "Draft",
        icon: <Clock className="h-3 w-3" />,
        className: "bg-gray-100 text-gray-500",
    },
    SUBMITTED: {
        label: "Diajukan",
        icon: <AlertCircle className="h-3 w-3" />,
        className: "bg-gray-800 text-white",
    },
    APPROVED: {
        label: "Disetujui",
        icon: <CheckCircle2 className="h-3 w-3" />,
        className: "bg-black text-white",
    },
    REJECTED: {
        label: "Ditolak",
        icon: <XCircle className="h-3 w-3" />,
        className: "bg-gray-200 text-gray-600",
    },
    PAID: {
        label: "Dibayar",
        icon: <DollarSign className="h-3 w-3" />,
        className: "bg-gray-900 text-white",
    },
};

export default function AgentClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    useEffect(() => {
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
    }, []);

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

                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-50 hover:bg-transparent">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-5">Nasabah</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Rumah Sakit</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Penyakit</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Jumlah Klaim</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tanggal</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right pr-5">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                                        <p className="text-sm text-gray-400">Memuat data klaim...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredClaims.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">
                                                {search || activeFilter ? "Tidak ada klaim yang cocok" : "Belum ada klaim"}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {search || activeFilter ? "Ubah filter atau kata kunci" : "Buat klaim pertama Anda"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClaims.map((claim) => {
                                const cfg = statusConfig[claim.status] || { label: claim.status, icon: null, className: "bg-gray-100 text-gray-500" };
                                return (
                                    <TableRow key={claim.claim_id} className="border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                        <TableCell className="pl-5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                                                    {claim.client_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{claim.client_name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">{claim.hospital_name || <span className="text-gray-300">—</span>}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">{claim.disease_name || <span className="text-gray-300">—</span>}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-medium text-gray-800">
                                                {claim.total_amount
                                                    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(claim.total_amount)
                                                    : <span className="text-gray-300">—</span>}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                                                cfg.className
                                            )}>
                                                {cfg.icon}
                                                {cfg.label}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-500">
                                                {new Date(claim.claim_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                                                    >
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-100 shadow-lg p-1">
                                                    <DropdownMenuLabel className="text-xs font-semibold text-gray-400 px-2 py-1.5">Aksi</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        className="text-sm rounded-lg cursor-pointer"
                                                        onClick={() => navigator.clipboard.writeText(claim.claim_id)}
                                                    >
                                                        Salin ID Klaim
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-50" />
                                                    <DropdownMenuItem asChild className="text-sm rounded-lg cursor-pointer">
                                                        <Link href={`/agent/claims/${claim.claim_id}`} className="flex items-center gap-2">
                                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                                            Lihat Detail
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

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
