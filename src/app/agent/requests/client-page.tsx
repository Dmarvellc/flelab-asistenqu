"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Search, ArrowRight, Clock, CheckCircle2, XCircle, AlertCircle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Request = {
    request_id: string;
    person_name: string;
    person_nik: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    additional_data_request: string;
    created_at: string;
    hospital_email: string;
};

const statusConfig = {
    PENDING: { label: "Menunggu", icon: Clock },
    APPROVED: { label: "Disetujui", icon: CheckCircle2 },
    REJECTED: { label: "Ditolak", icon: XCircle },
    COMPLETED: { label: "Selesai", icon: CheckCircle2 },
};

export default function AgentRequestsPage({ initialRequests }: { initialRequests: Request[] }) {
    const [requests, setRequests] = useState<Request[]>(initialRequests || []);
    const [loading, setLoading] = useState(!initialRequests);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<Request['status'] | 'ALL'>('ALL');

    useEffect(() => {
        if (initialRequests) return;
        const fetchRequests = async () => {
            try {
                const res = await fetch("/api/agent/requests");
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, [initialRequests]);

    const filtered = requests.filter(r => {
        const matchesSearch =
            r.person_name.toLowerCase().includes(search.toLowerCase()) ||
            r.person_nik.includes(search);
        const matchesFilter = activeFilter === 'ALL' || r.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const counts = requests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const pendingCount = counts['PENDING'] || 0;

    const filterTabs = [
        { key: 'ALL' as const, label: 'Semua', count: requests.length },
        { key: 'PENDING' as const, label: 'Menunggu', count: counts['PENDING'] },
        { key: 'APPROVED' as const, label: 'Disetujui', count: counts['APPROVED'] },
        { key: 'COMPLETED' as const, label: 'Selesai', count: counts['COMPLETED'] },
        { key: 'REJECTED' as const, label: 'Ditolak', count: counts['REJECTED'] },
    ].filter(t => t.count);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    {pendingCount > 0 ? (
                        <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                            <AlertCircle className="h-3 w-3" />
                            <span>{pendingCount} permintaan perlu perhatian</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full mb-3">
                            <ClipboardList className="h-3 w-3" />
                            <span>Semua permintaan</span>
                        </div>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Permintaan Data Pasien</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Daftar permintaan data medis dari Rumah Sakit untuk klien Anda.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: requests.length },
                    { label: "Menunggu", value: counts['PENDING'] || 0 },
                    { label: "Diproses", value: counts['APPROVED'] || 0 },
                    { label: "Selesai", value: counts['COMPLETED'] || 0 },
                ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                        <p className="text-2xl font-bold tabular-nums text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="search"
                        placeholder="Cari nama atau NIK..."
                        className="pl-10 bg-white border-gray-200 text-sm rounded-xl focus:border-gray-300 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={cn(
                                "text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150 flex items-center gap-1.5",
                                activeFilter === tab.key
                                    ? "bg-black text-white shadow-sm"
                                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "text-[10px] font-semibold rounded-full px-1.5 py-0.5",
                                    activeFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                    <p className="text-sm text-gray-400">Memuat permintaan...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                        <FileText className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="text-base font-semibold text-gray-700">Tidak ada permintaan</p>
                    <p className="text-sm text-gray-400 mt-1">
                        {search || activeFilter !== 'ALL'
                            ? "Coba ubah filter atau kata kunci pencarian Anda."
                            : "Belum ada permintaan data dari Rumah Sakit."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-2">
                    {filtered.map((req) => {
                        const cfg = statusConfig[req.status];
                        const Icon = cfg.icon;

                        return (
                            <div
                                key={req.request_id}
                                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 rounded-xl transition-all duration-200"
                            >
                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-bold text-gray-900 text-[15px]">{req.person_name}</h3>
                                        <span className="font-mono text-xs tracking-wide text-gray-400">
                                            {req.person_nik}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-xs font-medium">
                                            <Icon className="h-3.5 w-3.5" />
                                            <span className={cn(
                                                req.status === 'PENDING' ? "text-gray-900" :
                                                    req.status === 'APPROVED' ? "text-black" :
                                                        "text-gray-500"
                                            )}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-gray-500 mt-1">
                                        <span className="truncate max-w-[200px] font-medium text-gray-700">{req.hospital_email}</span>
                                        <span className="text-gray-300">•</span>
                                        <span>
                                            {new Date(req.created_at).toLocaleDateString("id-ID", {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-gray-300">•</span>
                                        <span className="truncate max-w-xs">{req.additional_data_request}</span>
                                    </div>
                                </div>

                                {/* Action */}
                                <Link
                                    href={`/agent/requests/${req.request_id}`}
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
    );
}
