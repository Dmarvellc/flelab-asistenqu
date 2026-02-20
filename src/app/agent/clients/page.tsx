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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, MoreHorizontal, Loader2, Users, ArrowUpRight } from "lucide-react";
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

export default function AgentClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
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
    }, []);

    const filteredClients = clients.filter(client =>
        client.full_name.toLowerCase().includes(search.toLowerCase()) ||
        client.latest_product?.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = clients.filter(c => c.status === 'ACTIVE').length;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                        <Users className="h-3 w-3" />
                        <span>{clients.length} Total Klien</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Daftar Klien</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Kelola data nasabah dan polis asuransi mereka.
                    </p>
                </div>
                <Link href="/agent/clients/new">
                    <Button className="bg-black hover:bg-gray-900 text-white gap-2 shadow-sm hover:shadow-md transition-all duration-200">
                        <Plus className="h-4 w-4" />
                        Tambah Klien
                    </Button>
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Total Klien", value: clients.length },
                    { label: "Klien Aktif", value: activeCount },
                    { label: "Polis Terkelola", value: clients.reduce((s, c) => s + parseInt(c.contract_count || "0"), 0) },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
                        <p className="text-2xl font-bold tabular-nums text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Search Bar */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="search"
                            placeholder="Cari nama atau produk..."
                            className="pl-10 bg-gray-50 border-gray-100 text-sm rounded-xl focus:bg-white transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {search && (
                        <p className="text-xs text-gray-400 ml-4">
                            {filteredClients.length} hasil ditemukan
                        </p>
                    )}
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-50 hover:bg-transparent">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 pl-5">Nasabah</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Produk Terakhir</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Polis</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400">Bergabung</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right pr-5">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                                        <p className="text-sm text-gray-400">Memuat data klien...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredClients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <Users className="h-5 w-5 text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">
                                                {search ? "Tidak ada klien yang cocok" : "Belum ada klien"}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {search ? "Coba kata kunci lain" : "Tambah klien pertama Anda"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClients.map((client, idx) => (
                                <TableRow
                                    key={client.client_id}
                                    className="border-gray-50 hover:bg-gray-50/50 transition-colors group"
                                >
                                    <TableCell className="pl-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 text-white font-semibold text-sm">
                                                {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{client.full_name}</p>
                                                <p className="text-xs text-gray-400">{client.phone_number || "—"}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-600">
                                            {client.latest_product || <span className="text-gray-300 italic">—</span>}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center justify-center h-7 min-w-[60px] rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold px-3">
                                            {client.contract_count} Polis
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                                            client.status === 'ACTIVE'
                                                ? "bg-gray-900 text-white"
                                                : "bg-gray-100 text-gray-500"
                                        )}>
                                            <span className={cn(
                                                "h-1.5 w-1.5 rounded-full",
                                                client.status === 'ACTIVE' ? "bg-white" : "bg-gray-400"
                                            )} />
                                            {client.status === 'ACTIVE' ? 'Aktif' : client.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-500">
                                            {new Date(client.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right pr-5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                                >
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-100 shadow-lg p-1">
                                                <DropdownMenuLabel className="text-xs font-semibold text-gray-400 px-2 py-1.5">Aksi</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    className="text-sm rounded-lg cursor-pointer"
                                                    onClick={() => navigator.clipboard.writeText(client.client_id)}
                                                >
                                                    Salin ID Klien
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-gray-50" />
                                                <DropdownMenuItem asChild className="text-sm rounded-lg cursor-pointer">
                                                    <Link href={`/agent/clients/${client.client_id}`} className="flex items-center gap-2">
                                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                                        Lihat Detail
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild className="text-sm rounded-lg cursor-pointer">
                                                    <Link href={`/agent/clients/${client.client_id}`}>
                                                        Lihat Daftar Polis
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

                {/* Footer */}
                {!loading && filteredClients.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            Menampilkan {filteredClients.length} dari {clients.length} klien
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
