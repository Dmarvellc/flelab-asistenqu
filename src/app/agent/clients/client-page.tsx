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
import { Plus, Search, MoreHorizontal, Users, ArrowUpRight } from "lucide-react";
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
};

export default function AgentClientsPage({ initialClients }: { initialClients: Client[] }) {
    const [clients, setClients] = useState<Client[]>(initialClients || []);
    const [loading, setLoading] = useState(!initialClients);
    const [search, setSearch] = useState("");
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

    const filteredClients = clients.filter(client =>
        client.full_name.toLowerCase().includes(search.toLowerCase()) ||
        client.latest_product?.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = clients.filter(c => c.status === 'ACTIVE').length;

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1.5 rounded-full mb-4 shadow-sm">
                        <Users className="h-3.5 w-3.5 text-white/70" />
                        <span>{clients.length} {lang === 'en' ? 'Total Clients' : 'Total Klien'}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.clients}</h1>
                    <p className="mt-1.5 text-sm text-gray-500 font-medium">
                        {lang === 'en' ? 'Manage your clients and their insurance policies.' : 'Kelola data nasabah dan polis asuransi mereka.'}
                    </p>
                </div>
                <Link href="/agent/clients/new">
                    <Button className="bg-black hover:bg-gray-900 text-white gap-2 shadow-lg shadow-black/10 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 rounded-xl h-11 px-5 font-semibold">
                        <Plus className="h-4 w-4" />
                        {t.addClient.replace('+ ', '')}
                    </Button>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { label: lang === 'en' ? "Total Clients" : "Total Klien", value: clients.length },
                    { label: t.activeClients, value: activeCount },
                    { label: lang === 'en' ? "Managed Policies" : "Polis Terkelola", value: clients.reduce((s, c) => s + parseInt(c.contract_count || "0"), 0) },
                ].map((stat, i) => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group" style={{ animationDelay: `${i * 100}ms` }}>
                        <p className="text-4xl font-black tabular-nums tracking-tighter text-black mb-1">{stat.value}</p>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-sm font-semibold text-gray-500 group-hover:text-black transition-colors">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-5 border-b border-gray-50 bg-gray-50/50 gap-4">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder={t.searchPlaceholder}
                            className="w-full pl-10 h-11 rounded-xl bg-white border-gray-200 text-sm focus:border-black focus:ring-black shadow-sm transition-all"
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
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-50 hover:bg-transparent bg-gray-50/50">
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 pl-6 h-12">{lang === 'en' ? 'Client' : 'Nasabah'}</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 h-12">{lang === 'en' ? 'Latest Product' : 'Produk Terakhir'}</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 h-12">{lang === 'en' ? 'Total Policies' : 'Total Polis'}</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 h-12">Status</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 h-12">{lang === 'en' ? 'Joined' : 'Bergabung'}</TableHead>
                                <TableHead className="text-xs font-bold uppercase tracking-widest text-gray-400 text-right pr-6 h-12">{lang === 'en' ? 'Action' : 'Aksi'}</TableHead>
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
                                            <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                                                <Users className="h-6 w-6 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-gray-900">
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
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <p className="font-bold text-gray-900 text-sm group-hover:text-black transition-colors">{client.full_name}</p>
                                                <p className="text-xs font-medium text-gray-500">{client.phone_number || "—"}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm font-semibold text-gray-700">
                                                {client.latest_product || <span className="text-gray-300 font-medium italic">—</span>}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="inline-flex items-center justify-center h-8 min-w-[64px] rounded-lg bg-gray-100 text-gray-700 text-xs font-bold px-3">
                                                {client.contract_count} {lang === 'en' ? 'Policies' : 'Polis'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase px-2 py-1 border",
                                                client.status === 'ACTIVE'
                                                    ? "bg-black text-white border-black"
                                                    : "bg-white text-gray-500 border-gray-200"
                                            )}>
                                                {client.status === 'ACTIVE' ? (lang === 'en' ? 'Active' : 'Aktif') : client.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide text-[11px]">
                                                {new Date(client.created_at).toLocaleDateString(lang === 'en' ? "en-US" : "id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 rounded-lg bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-black hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
                                                    >
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 rounded-2xl border border-gray-100 shadow-xl p-1.5 animate-in slide-in-from-top-2">
                                                    <DropdownMenuLabel className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-2 py-1.5">
                                                        {lang === 'en' ? 'Actions' : 'Aksi'}
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        className="text-sm font-medium rounded-xl cursor-pointer py-2 focus:bg-gray-50 focus:text-black"
                                                        onClick={() => navigator.clipboard.writeText(client.client_id)}
                                                    >
                                                        {lang === 'en' ? 'Copy Client ID' : 'Salin ID Klien'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-gray-50 my-1" />
                                                    <DropdownMenuItem asChild className="text-sm font-medium rounded-xl cursor-pointer py-2 focus:bg-gray-50 focus:text-black">
                                                        <Link href={`/agent/clients/${client.client_id}`} className="flex items-center justify-between w-full">
                                                            {lang === 'en' ? 'View Details' : 'Lihat Detail'}
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-gray-400" />
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="text-sm font-medium rounded-xl cursor-pointer py-2 focus:bg-gray-50 focus:text-black">
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
                    <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                            {lang === 'en' ? `Showing ${filteredClients.length} of ${clients.length}` : `Menampilkan ${filteredClients.length} dari ${clients.length}`}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
