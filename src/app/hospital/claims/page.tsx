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
import { Search, FileText, MoreHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Claim = {
    claim_id: string;
    client_name: string;
    hospital_name: string;
    disease_name: string;
    status: string;
    total_amount: number;
    claim_date: string;
};

export default function HospitalClaimsPage() {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchClaims = async () => {
            try {
                const res = await fetch("/api/hospital/claims");
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

    const filteredClaims = claims.filter(claim => 
        claim.client_name.toLowerCase().includes(search.toLowerCase()) ||
        claim.disease_name?.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED': return <Badge className="bg-blue-500">Diajukan</Badge>;
            case 'APPROVED': return <Badge className="bg-green-500">Disetujui</Badge>;
            case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
            case 'PAID': return <Badge className="bg-emerald-500">Dibayar</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Daftar Klaim Masuk</h2>
                    <p className="text-muted-foreground">
                        Kelola klaim asuransi yang masuk dari agen.
                    </p>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari nasabah atau penyakit..."
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
                            <TableHead>Nasabah</TableHead>
                            <TableHead>Penyakit</TableHead>
                            <TableHead>Jumlah Klaim</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tanggal Klaim</TableHead>
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
                        ) : filteredClaims.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Belum ada klaim masuk.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClaims.map((claim) => (
                                <TableRow key={claim.claim_id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span>{claim.client_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{claim.disease_name || "-"}</TableCell>
                                    <TableCell>
                                        {claim.total_amount ? 
                                            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(claim.total_amount) 
                                            : "-"}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(claim.status)}
                                    </TableCell>
                                    <TableCell>{new Date(claim.claim_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</TableCell>
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
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(claim.claim_id)}>
                                                    Salin ID Klaim
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/hospital/claims/${claim.claim_id}`}>Lihat Detail</Link>
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
        </div>
    );
}
