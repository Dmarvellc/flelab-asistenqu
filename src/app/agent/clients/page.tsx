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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, User, FileText, MoreHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Daftar Klien</h2>
                    <p className="text-muted-foreground">
                        Kelola data nasabah dan polis asuransi mereka.
                    </p>
                </div>
                <Link href="/agent/clients/new">
                    <Button className="bg-black hover:bg-gray-900 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Klien
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari nama atau produk..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Nasabah</TableHead>
                            <TableHead>Produk Terakhir</TableHead>
                            <TableHead>Total Polis</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Bergabung Sejak</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                                    Memuat data...
                                </TableCell>
                            </TableRow>
                        ) : filteredClients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Belum ada klien ditemukan.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClients.map((client) => (
                                <TableRow key={client.client_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{client.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{client.phone_number}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{client.latest_product || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="rounded-full px-2">
                                            {client.contract_count} Polis
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={client.status === 'ACTIVE' ? 'default' : 'outline'} className={client.status === 'ACTIVE' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                                            {client.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(client.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(client.client_id)}>
                                                    Salin ID Klien
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/agent/clients/${client.client_id}`}>Lihat Detail</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>Lihat Polis</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
