
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, X, Upload, FileText, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type RequestDetail = {
    request_id: string;
    person_name: string;
    person_nik: string;
    birth_date: string;
    gender: string;
    address: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    additional_data_request: string;
    additional_data_file: string | null;
    created_at: string;
    hospital_email: string;
};

export default function AgentRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const fetchRequest = async () => {
        try {
            const res = await fetch(`/api/agent/requests/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setRequest(data.request);
            } else {
                toast({ title: "Gagal", description: "Gagal memuat detail permintaan.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequest();
    }, [params.id]);

    const handleStatusUpdate = async (status: 'APPROVED' | 'REJECTED') => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/agent/requests/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: `Status berhasil diperbarui.` });
                fetchRequest();
            } else {
                toast({ title: "Gagal", description: "Gagal memperbarui status.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Terjadi kesalahan.", variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };



    const handleUpload = async () => {
        if (!file) return;
        setProcessing(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`/api/agent/requests/${params.id}/upload`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: "Dokumen berhasil diunggah." });
                setUploadOpen(false);
                fetchRequest();
            } else {
                toast({ title: "Gagal", description: "Gagal mengunggah dokumen.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error" });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Memuat...</div>;
    if (!request) return <div className="p-8 text-center text-muted-foreground">Permintaan tidak ditemukan.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/agent/requests">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Detail Permintaan</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">ID: {request.request_id}</p>
                        <Badge className={
                            request.status === 'PENDING' ? 'bg-yellow-500' :
                                request.status === 'APPROVED' ? 'bg-blue-500' :
                                    request.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-500'
                        }>
                            {request.status}
                        </Badge>
                    </div>
                </div>

            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    {/* Profil Pasien */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profil Pasien
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nama Lengkap</p>
                                    <p className="font-semibold">{request.person_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">NIK</p>
                                    <p className="font-mono">{request.person_nik}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tanggal Lahir</p>
                                    <p>{request.birth_date ? new Date(request.birth_date).toLocaleDateString("id-ID") : "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Jenis Kelamin</p>
                                    <p>{request.gender === 'MALE' ? 'Laki-laki' : request.gender === 'FEMALE' ? 'Perempuan' : "-"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Alamat</p>
                                    <p>{request.address || "-"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Informasi Permintaan */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Isi Permintaan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg border">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Pesan dari Rumah Sakit:</p>
                                <p className="text-base font-medium">{request.additional_data_request}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p>Dikirim oleh: {request.hospital_email}</p>
                                <p>Pada: {new Date(request.created_at).toLocaleString("id-ID")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Tindakan */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Tindakan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {request.status === 'PENDING' && (
                                <div className="flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground">
                                        Silakan tinjau permintaan ini. Jika valid, klik Setujui untuk mulai menyiapkan data.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleStatusUpdate('APPROVED')}
                                            disabled={processing}
                                        >
                                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                            Setujui
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            variant="destructive"
                                            onClick={() => handleStatusUpdate('REJECTED')}
                                            disabled={processing}
                                        >
                                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                            Tolak
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {request.status === 'APPROVED' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded border border-blue-100">
                                        <Check className="h-5 w-5" />
                                        <p className="text-sm font-medium">Permintaan disetujui. Silakan unggah data.</p>
                                    </div>
                                    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Data / Dokumen
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Upload Dokumen</DialogTitle>
                                                <DialogDescription>
                                                    Pilih file (PDF, Gambar) untuk dikirim ke Rumah Sakit.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="file">File</Label>
                                                    <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
                                                <Button onClick={handleUpload} disabled={!file || processing}>
                                                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Upload & Kirim"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            )}

                            {request.status === 'COMPLETED' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded border border-green-100">
                                        <Check className="h-5 w-5" />
                                        <p className="text-sm font-medium">Data berhasil dikirim ke Rumah Sakit.</p>
                                    </div>
                                    {request.additional_data_file && (
                                        <Button variant="outline" className="w-full" asChild>
                                            <a href={request.additional_data_file} target="_blank" rel="noopener noreferrer">
                                                <FileText className="mr-2 h-4 w-4" />
                                                Lihat File Terkirim
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            )}

                            {request.status === 'REJECTED' && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded border border-red-100">
                                    <X className="h-5 w-5" />
                                    <p className="text-sm font-medium">Permintaan telah ditolak.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
