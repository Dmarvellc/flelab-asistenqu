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
        <div className="flex flex-col gap-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                    {pendingCount > 0 ? (
                        <p className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {pendingCount} permintaan perlu perhatian
                        </p>
                    ) : (
                        <p className="text-[15px] font-semibold text-gray-500 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" />
                            Semua permintaan tertangani
                        </p>
                    )}
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mt-2">Permintaan Data Pasien</h1>
                    <p className="mt-1 text-base text-gray-500">
                        Daftar permintaan data medis dari Rumah Sakit untuk klien Anda.
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total", value: requests.length },
                    { label: "Menunggu", value: counts['PENDING'] || 0 },
                    { label: "Diproses", value: counts['APPROVED'] || 0 },
                    { label: "Selesai", value: counts['COMPLETED'] || 0 },
                ].map((s, i) => (
                    <div key={s.label} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                        <p className="text-4xl font-bold tabular-nums tracking-tight text-gray-900 mb-2">{s.value}</p>
                        <p className="text-[15px] font-medium text-gray-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Content Wrapper */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
                {/* Search + Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-8 border-b border-gray-50 bg-gray-50/30 gap-6">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="search"
                            placeholder="Cari nama atau NIK..."
                            className="pl-12 h-12 bg-white border-gray-200 text-[15px] rounded-2xl focus:bg-white focus:border-gray-300 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveFilter(tab.key)}
                                className={cn(
                                    "text-[14px] font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm border",
                                    activeFilter === tab.key
                                        ? "bg-gray-900 text-white border-transparent"
                                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={cn(
                                        "text-[11px] font-bold rounded-full px-2 py-0.5",
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
                <div className="p-4 sm:p-8 bg-white min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6">
                            <div className="h-12 w-12 rounded-full border-[3px] border-gray-100 border-t-gray-900 animate-spin" />
                            <p className="text-base font-medium text-gray-400">Memuat permintaan...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500 bg-gray-50/50 rounded-[24px] border border-gray-100/50 m-4">
                            <div className="h-20 w-20 rounded-[24px] bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6">
                                <FileText className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-xl font-bold text-gray-900 mb-2">Tidak ada permintaan</p>
                            <p className="text-base text-gray-500 max-w-sm mx-auto leading-relaxed">
                                {search || activeFilter !== 'ALL'
                                    ? "Coba ubah filter atau kata kunci pencarian Anda."
                                    : "Belum ada permintaan data dari Rumah Sakit."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filtered.map((req) => {
                                const cfg = statusConfig[req.status];
                                const Icon = cfg.icon;

                                return (
                                    <div
                                        key={req.request_id}
                                        className="group flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-2xl transition-all duration-300"
                                    >
                                        <div className="flex flex-col gap-3 flex-1 min-w-0 pr-6">
                                            <div className="flex items-center justify-between lg:justify-start gap-4 flex-wrap w-full">
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-gray-900 text-lg">{req.person_name}</h3>
                                                    <span className="font-mono text-[13px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                                                        {req.person_nik}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-[13px] font-bold px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 shadow-sm w-max lg:ml-auto">
                                                    <Icon className="h-4 w-4" />
                                                    <span className={cn(
                                                        req.status === 'PENDING' ? "text-gray-900" :
                                                            req.status === 'APPROVED' || req.status === 'COMPLETED' ? "text-gray-900" :
                                                                "text-gray-600"
                                                    )}>
                                                        {cfg.label}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-gray-500 mt-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-gray-700 truncate max-w-[200px]">{req.hospital_email}</span>
                                                </div>
                                                <span className="text-gray-300 hidden sm:inline">•</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span>
                                                        {new Date(req.created_at).toLocaleDateString("id-ID", {
                                                            day: 'numeric', month: 'long', year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                <span className="text-gray-300 hidden sm:inline">•</span>
                                                {req.additional_data_request && req.additional_data_request.trim() !== '' && (
                                                    <span className="truncate max-w-md text-gray-600 font-medium bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                                                        {req.additional_data_request}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <Link
                                            href={`/agent/requests/${req.request_id}`}
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
            </div>
        </div>
    );
}
