"use client";

import { useEffect, useState } from "react";
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
import { Plus, Search, FileText, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Request = {
    request_id: string;
    person_name: string;
    person_nik: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    additional_data_request: string;
    additional_data_file: string | null;
    created_at: string;
};

type Person = {
    person_id: string;
    full_name: string;
    identity_number: string;
    phone_number: string;
};

export default function HospitalPatientsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    
    // Form state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Person[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [additionalData, setAdditionalData] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { toast } = useToast();

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/hospital/patients/request");
            const data = await res.json();
            if (res.ok) {
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error("Failed to fetch requests", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Search persons
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length < 3) {
                setSearchResults([]);
                return;
            }
            setSearching(true);
            try {
                const res = await fetch(`/api/hospital/patients/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.status === 401) {
                    console.error("Unauthorized");
                    toast({
                        title: "Sesi Habis",
                        description: "Silakan login kembali.",
                        variant: "destructive",
                    });
                    setSearchResults([]);
                    return;
                }
                const data = await res.json();
                if (res.ok) {
                    setSearchResults(data.results || []);
                } else {
                    console.error("Search error", data);
                    setSearchResults([]);
                }
            } catch (error) {
                console.error("Search failed", error);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSubmit = async () => {
        if (!selectedPerson) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/hospital/patients/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    person_id: selectedPerson.person_id,
                    additional_data_request: additionalData,
                }),
            });

            if (res.ok) {
                toast({
                    title: "Berhasil",
                    description: "Permintaan data berhasil dibuat.",
                });
                setOpen(false);
                fetchRequests();
                // Reset form
                setSelectedPerson(null);
                setSearchQuery("");
                setAdditionalData("");
            } else {
                const err = await res.json();
                toast({
                    title: "Gagal",
                    description: err.error || "Terjadi kesalahan.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Submit failed", error);
            toast({
                title: "Error",
                description: "Gagal menghubungi server.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Menunggu</Badge>;
            case 'APPROVED': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Disetujui</Badge>;
            case 'REJECTED': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Ditolak</Badge>;
            case 'COMPLETED': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Selesai</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Data Pasien</h2>
                    <p className="text-muted-foreground">
                        Kelola permintaan data pasien ke agen asuransi.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Permintaan Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Buat Permintaan Data</DialogTitle>
                            <DialogDescription>
                                Cari pasien dan minta data tambahan dari agen mereka.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Cari Pasien (Nama / NIK)</Label>
                                <p className="text-[10px] text-muted-foreground">Ketik nama dan klik hasil pencarian untuk memilih.</p>
                                <Input 
                                    placeholder="Ketik minimal 3 karakter..." 
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (selectedPerson) setSelectedPerson(null);
                                    }}
                                />
                                {searching && <p className="text-xs text-muted-foreground mt-2">Mencari...</p>}
                                {!searching && searchQuery.length >= 3 && searchResults.length === 0 && !selectedPerson && (
                                    <p className="text-xs text-red-500 mt-2">
                                        Pasien tidak ditemukan. Pastikan nama atau NIK benar.
                                    </p>
                                )}
                                {searchResults.length > 0 && !selectedPerson && (
                                    <div className="border rounded-md max-h-40 overflow-y-auto mt-2 shadow-sm bg-white">
                                        {searchResults.map(person => (
                                            <div 
                                                key={person.person_id}
                                                className="p-2 hover:bg-muted cursor-pointer text-sm border-b last:border-0"
                                                onClick={() => {
                                                    setSelectedPerson(person);
                                                    setSearchQuery(person.full_name);
                                                    setSearchResults([]);
                                                }}
                                            >
                                                <div className="font-medium">{person.full_name}</div>
                                                <div className="text-xs text-muted-foreground">NIK: {person.identity_number}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {selectedPerson && (
                                    <div className="p-2 bg-muted rounded-md text-sm flex justify-between items-center">
                                        <span>Terpilih: <strong>{selectedPerson.full_name}</strong></span>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setSelectedPerson(null);
                                            setSearchQuery("");
                                        }}>Ubah</Button>
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Data Tambahan yang Dibutuhkan</Label>
                                <Textarea 
                                    placeholder="Contoh: Rekam medis 3 bulan terakhir, Hasil Lab..." 
                                    value={additionalData}
                                    onChange={(e) => setAdditionalData(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                            <Button onClick={handleSubmit} disabled={submitting || !selectedPerson}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim Permintaan"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Pasien</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>Permintaan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead className="text-right">File</TableHead>
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
                        ) : requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Belum ada permintaan data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.request_id}>
                                    <TableCell className="font-medium">{req.person_name}</TableCell>
                                    <TableCell>{req.person_nik}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={req.additional_data_request}>
                                        {req.additional_data_request || "-"}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                    <TableCell>{new Date(req.created_at).toLocaleDateString("id-ID")}</TableCell>
                                    <TableCell className="text-right">
                                        {req.additional_data_file ? (
                                            <a href={req.additional_data_file} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        ) : "-"}
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
