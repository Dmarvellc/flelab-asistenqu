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
    PENDING: { label: "Menunggu", icon: Clock, bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
    APPROVED: { label: "Disetujui", icon: CheckCircle2, bg: "bg-gray-900", text: "text-white", dot: "bg-white" },
    REJECTED: { label: "Ditolak", icon: XCircle, bg: "bg-gray-200", text: "text-gray-600", dot: "bg-gray-600" },
    COMPLETED: { label: "Selesai", icon: CheckCircle2, bg: "bg-black", text: "text-white", dot: "bg-white" },
};

export default function AgentRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<Request['status'] | 'ALL'>('ALL');

    useEffect(() => {
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
    }, []);

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

    const filterTabs: { key: Request['status'] | 'ALL'; label: string; count?: number }[] = [
        { key: 'ALL', label: 'Semua', count: requests.length },
        { key: 'PENDING', label: 'Menunggu', count: counts['PENDING'] },
        { key: 'APPROVED', label: 'Disetujui', count: counts['APPROVED'] },
        { key: 'COMPLETED', label: 'Selesai', count: counts['COMPLETED'] },
        { key: 'REJECTED', label: 'Ditolak', count: counts['REJECTED'] },
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

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                    <p className="text-sm text-gray-400">Memuat permintaan...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
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
                <div className="grid gap-3">
                    {filtered.map((req) => {
                        const cfg = statusConfig[req.status];
                        const Icon = cfg.icon;
                        const isUrgent = req.status === 'PENDING';

                        return (
                            <div
                                key={req.request_id}
                                className={cn(
                                    "group bg-white rounded-2xl border transition-all duration-200 hover:shadow-md",
                                    isUrgent
                                        ? "border-gray-200 border-l-[3px] border-l-gray-900"
                                        : "border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
                                    {/* Avatar */}
                                    <div className={cn(
                                        "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm",
                                        isUrgent ? "bg-black" : "bg-gray-200"
                                    )}>
                                        <span className={isUrgent ? "text-white" : "text-gray-500"}>
                                            {req.person_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-gray-900">{req.person_name}</h3>
                                            <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">
                                                {req.person_nik}
                                            </span>
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                                                cfg.bg, cfg.text
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                                                {cfg.label}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            <span className="font-medium text-gray-700">Permintaan: </span>
                                            {req.additional_data_request}
                                        </p>

                                        <p className="text-xs text-gray-400">
                                            Dari: <span className="text-gray-500">{req.hospital_email}</span>
                                            {" · "}
                                            {new Date(req.created_at).toLocaleDateString("id-ID", {
                                                day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <Link
                                        href={`/agent/requests/${req.request_id}`}
                                        className={cn(
                                            "shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200",
                                            isUrgent
                                                ? "bg-black text-white hover:bg-gray-800"
                                                : "border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                        )}
                                    >
                                        Lihat Detail
                                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
