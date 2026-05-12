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
import { Plus, Search, MoreHorizontal, Users, ArrowUpRight, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
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
import { useTranslation } from "@/components/providers/i18n-provider";

type Client = {
    client_id: string;
    full_name: string;
    phone_number: string;
    address: string;
    status: string;
    created_at: string;
    contract_count: string;
    latest_product: string;
    next_due_date?: string | null;
    latest_policy_status?: string | null;
    total_premium?: string | null;
};

type Filter = "ALL" | "DUE_SOON" | "LAPSE" | "ACTIVE";

const daysUntil = (d?: string | null) => {
    if (!d) return null;
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

function DueCell({ nextDue, lang }: { nextDue?: string | null; lang: string }) {
    if (!nextDue) return <span className="text-xs text-gray-300 italic">—</span>;
    const d = daysUntil(nextDue) ?? 0;
    const base = "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border";
    let tone = "bg-white text-emerald-700 border-emerald-200";
    let label: string;
    if (d < -30) { tone = "bg-red-50 text-red-700 border-red-200"; label = `Lapse ${Math.abs(d)}h`; }
    else if (d < 0) { tone = "bg-white text-amber-700 border-amber-200"; label = `Lewat ${Math.abs(d)}h`; }
    else if (d <= 7) { tone = "bg-white text-amber-700 border-amber-200"; label = `${d}h lagi`; }
    else if (d <= 14) { tone = "bg-white text-blue-700 border-blue-200"; label = `${d}h lagi`; }
    else label = new Date(nextDue).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" });
    return <span className={cn(base, tone)}>{label}</span>;
}

export default function AgentClientsPage({ initialClients }: { initialClients: Client[] }) {
    const [clients, setClients] = useState<Client[]>(initialClients || []);
    const [loading, setLoading] = useState(!initialClients);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("ALL");
    const { t, lang } = useTranslation();

    useEffect(() => {
        if (initialClients) return;
        const fetchClients = async () => {
            try {
                const res = await fetch("/api/agent/clients");
                const data = await res.json();
                if (res.ok) {
                    setClients(data.clients || []);
                }
            } catch (error) {
                console.error("Failed to fetch clients", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, [initialClients]);

    const filteredClients = clients.filter(client => {
        const matchesSearch =
            client.full_name.toLowerCase().includes(search.toLowerCase()) ||
            client.latest_product?.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (filter === "ACTIVE") return client.status === "ACTIVE";
        if (filter === "LAPSE") {
            return client.latest_policy_status === "LAPSE" || (daysUntil(client.next_due_date) ?? 9999) < -30;
        }
        if (filter === "DUE_SOON") {
            const d = daysUntil(client.next_due_date);
            return d !== null && d >= 0 && d <= 14;
        }
        return true;
    });

    const activeCount = clients.filter(c => c.status === 'ACTIVE').length;
    const dueSoonCount = clients.filter(c => {
        const d = daysUntil(c.next_due_date);
        return d !== null && d >= 0 && d <= 14;
    }).length;
    const lapseCount = clients.filter(c =>
        c.latest_policy_status === "LAPSE" || (daysUntil(c.next_due_date) ?? 9999) < -30
    ).length;
    const totalPremium = clients.reduce((s, c) => s + parseFloat(c.total_premium || "0"), 0);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Users className="h-3.5 w-3.5" />
                        {clients.length} {lang === 'en' ? 'Total Clients' : 'Total Klien'}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">{t.clients}</h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        {lang === 'en' ? 'Manage your clients and their insurance policies in one integrated view.' : 'Kelola data nasabah dan polis asuransi mereka dalam satu tampilan terpadu.'}
                    </p>
                </div>
                <Link href="/agent/clients/new">
                    <button className="bg-black hover:bg-black text-white text-sm font-semibold h-10 px-4 rounded-md transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        {t.addClient.replace('+ ', '')}
                    </button>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: lang === 'en' ? "Total Clients" : "Total Klien", value: clients.length, tone: "text-black" },
                    { label: t.activeClients, value: activeCount, tone: "text-emerald-600" },
                    { label: lang === 'en' ? "Due Soon (14d)" : "Jatuh Tempo (14h)", value: dueSoonCount, tone: "text-amber-600" },
                    { label: lang === 'en' ? "Total Premium" : "Total Premi", value: `Rp ${(totalPremium/1_000_000).toFixed(1)}Jt`, tone: "text-black", small: true },
                ].map((stat, i) => (
                    <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                        <p className={cn("font-bold tabular-nums tracking-tight mb-1", stat.small ? "text-2xl" : "text-3xl", stat.tone)}>{stat.value}</p>
                        <p className="text-[13px] font-medium text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
                {[
                    { id: "ALL" as Filter,      label: lang === 'en' ? "All" : "Semua",           count: clients.length, icon: Users },
                    { id: "ACTIVE" as Filter,   label: lang === 'en' ? "Active" : "Aktif",        count: activeCount,    icon: CheckCircle2 },
                    { id: "DUE_SOON" as Filter, label: lang === 'en' ? "Due Soon" : "Jatuh Tempo", count: dueSoonCount,   icon: Clock },
                    { id: "LAPSE" as Filter,    label: "Lapse",                                    count: lapseCount,     icon: AlertTriangle },
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition-all",
                            filter === f.id
                                ? "bg-black text-white border-gray-900 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        <f.icon className="w-3.5 h-3.5" />
                        {f.label}
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", filter === f.id ? "bg-white/20" : "bg-gray-100")}>
                            {f.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                {/* Search Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-8 border-b border-gray-50 bg-white gap-4">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            type="search"
                            placeholder={t.searchPlaceholder}
                            className="w-full pl-12 h-12 bg-white border-gray-200 text-[15px] rounded-md focus:bg-white focus:border-gray-300 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <p className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full shrink-0">
                            {filteredClients.length} {lang === 'en' ? 'results found' : 'hasil ditemukan'}
                        </p>
                    )}
                </div>

                <div className="overflow-x-auto w-full">
                    <Table className="min-w-[700px]">
                        <TableHeader>
                            <TableRow className="border-gray-50 hover:bg-transparent bg-white">
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-6 h-12">{lang === 'en' ? 'Client' : 'Nasabah'}</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-6 h-12">{lang === 'en' ? 'Latest Product' : 'Produk Terakhir'}</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-6 h-12">{lang === 'en' ? 'Policies' : 'Polis'}</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-6 h-12">{lang === 'en' ? 'Next Due' : 'Jatuh Tempo'}</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-6 h-12">Status</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-gray-500 text-right px-6 h-12">{lang === 'en' ? 'Action' : 'Aksi'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-black animate-spin" />
                                            <p className="text-sm font-medium text-gray-500">{t.loading}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredClients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="h-16 w-16 rounded-md bg-gray-50 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-black">
                                                    {search ? (lang === 'en' ? "No clients match your search" : "Tidak ada klien yang cocok") : (lang === 'en' ? "No clients yet" : "Belum ada klien")}
                                                </p>
                                                <p className="text-sm font-medium text-gray-500 mt-1">
                                                    {search ? (lang === 'en' ? "Try using different keywords" : "Coba kata kunci lain") : (lang === 'en' ? "Add your first client to get started" : "Tambah klien pertama Anda untuk memulai")}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClients.map((client) => (
                                    <TableRow
                                        key={client.client_id}
                                        className="border-gray-50 hover:bg-gray-50/80 transition-colors group cursor-default"
                                    >
                                        <TableCell className="px-6 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="font-bold text-black text-sm group-hover:text-black transition-colors">{client.full_name}</p>
                                                <p className="text-xs font-medium text-gray-500">{client.phone_number || "—"}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-3">
                                            <span className="text-[13px] font-semibold text-gray-700">
                                                {client.latest_product || <span className="text-gray-300 font-medium italic">—</span>}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-3">
                                            <span className="inline-flex items-center justify-center h-7 min-w-[56px] rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-[11px] font-bold px-3">
                                                {client.contract_count}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-3">
                                            <DueCell nextDue={client.next_due_date} lang={lang} />
                                        </TableCell>
                                        <TableCell className="px-6 py-3">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded border",
                                                client.latest_policy_status === 'LAPSE'
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : client.status === 'ACTIVE'
                                                    ? "bg-black text-white border-gray-900"
                                                    : "bg-white text-gray-500 border-gray-200"
                                            )}>
                                                {client.latest_policy_status === 'LAPSE'
                                                    ? 'Lapse'
                                                    : client.status === 'ACTIVE' ? (lang === 'en' ? 'Active' : 'Aktif') : client.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right px-6 py-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-black hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
                                                    >
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-md border border-gray-200 shadow-xl p-1.5 animate-in slide-in-from-top-2">
                                                    <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-2 py-1.5">
                                                        {lang === 'en' ? 'Actions' : 'Aksi'}
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        className="text-sm font-medium rounded-md cursor-pointer py-2 focus:bg-gray-50 focus:text-black"
                                                        onClick={() => navigator.clipboard.writeText(client.client_id)}
                                                    >
                                                        {lang === 'en' ? 'Copy Client ID' : 'Salin ID Klien'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-50 my-1" />
                                                    <DropdownMenuItem asChild className="text-sm font-medium rounded-md cursor-pointer py-2 focus:bg-gray-50 focus:text-black">
                                                        <Link href={`/agent/clients/${client.client_id}`} className="flex items-center justify-between w-full">
                                                            {lang === 'en' ? 'View Details' : 'Lihat Detail'}
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="text-sm font-medium rounded-md cursor-pointer py-2 focus:bg-gray-50 focus:text-black">
                                                        <Link href={`/agent/clients/${client.client_id}`}>
                                                            {lang === 'en' ? 'View Policies' : 'Lihat Daftar Polis'}
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                {!loading && filteredClients.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-white">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            {lang === 'en' ? `Showing ${filteredClients.length} of ${clients.length}` : `Menampilkan ${filteredClients.length} dari ${clients.length}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
