"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Check, X, FileQuestion, Plus, Trash2, FileText, User, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { extractClaimNotes } from "@/lib/claim-form-meta";
import { ActionModal } from "@/components/ui/action-modal";


type ClaimDetail = {
    claim_id: string;
    claim_date: string;
    status: string;
    total_amount: number;
    notes: string;
    client_name: string;
    gender: string;
    birth_date: string;
    nik: string;
    phone_number: string;
    address: string;
    policy_number: string;
    disease_name: string;
    hospital_name: string;
    created_at: string;
};

type FormField = {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: string; // Comma separated for UI simplicity
    required: boolean;
};

const manfaatHidupTemplate: Omit<FormField, "id">[] = [
    { label: "Jenis manfaat (Kesehatan/Cacat/Kondisi Kritis)", type: "select", required: true, options: "Kesehatan,Cacat Tetap Total,Cacat karena Kecelakaan,Kondisi Kritis,Pembebasan Premi" },
    { label: "Penyebab klaim", type: "select", required: true, options: "Penyakit,Kecelakaan,Lain-lain" },
    { label: "Keluhan & gejala pertama kali muncul (tanggal)", type: "date", required: true },
    { label: "Riwayat pengobatan sebelumnya (jika ada)", type: "text", required: true },
    { label: "Nama & alamat dokter / rumah sakit yang pernah merawat", type: "text", required: true },
    { label: "Kronologis kejadian (khusus kecelakaan jika ada)", type: "text", required: false },
    { label: "Apakah terkait alkohol/narkotika/obat lain", type: "select", required: true, options: "Tidak,Ya" },
];

const meninggalTemplate: Omit<FormField, "id">[] = [
    { label: "Jenis klaim meninggal", type: "select", required: true, options: "Meninggal Dunia,Meninggal karena Kecelakaan,Pembebasan Premi untuk Meninggal Dunia" },
    { label: "Penyebab meninggal", type: "select", required: true, options: "Penyakit,Kecelakaan,Lain-lain" },
    { label: "Tanggal & jam meninggal", type: "text", required: true },
    { label: "Tempat meninggal", type: "text", required: true },
    { label: "Keluhan & gejala sebelum meninggal", type: "text", required: true },
    { label: "Riwayat penyakit terdahulu terkait", type: "text", required: true },
    { label: "Kronologis kecelakaan (jika ada)", type: "text", required: false },
    { label: "Apakah terkait alkohol/narkotika/obat lain", type: "select", required: true, options: "Tidak,Ya" },
];

type Document = {
    document_id: string;
    file_url: string;
    created_at: string;
};

type InfoRequest = {
    request_id: string;
    status: string;
    form_schema: {
        id: string;
        label: string;
        type: 'text' | 'number' | 'date' | 'select';
        options?: string[];
        required: boolean;
    }[];
    response_data?: Record<string, any>;
    created_at: string;
    updated_at: string;
};

type NoticeState = {
    open: boolean;
    title: string;
    description: string;
};

export default function HospitalClaimDetailPage() {
    const params = useParams();
    const [claim, setClaim] = useState<ClaimDetail | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [infoRequests, setInfoRequests] = useState<InfoRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<null | 'APPROVED' | 'REJECTED'>(null);
    const [notice, setNotice] = useState<NoticeState>({
        open: false,
        title: "",
        description: "",
    });

    // Request Info State
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [requestFields, setRequestFields] = useState<FormField[]>([]);

    const openNotice = (title: string, description: string) => {
        setNotice({ open: true, title, description });
    };

    useEffect(() => {
        const fetchClaim = async () => {
            try {
                const res = await fetch(`/api/hospital/claims/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setClaim(data.claim);
                    setInfoRequests(data.infoRequests || []);
                } else {
                    console.error("Failed to fetch claim");
                }

                // Fetch documents
                const docRes = await fetch(`/api/agent/claims/${params.id}/documents`);
                if (docRes.ok) {
                    const docData = await docRes.json();
                    setDocuments(docData.documents || []);
                }

            } catch (error) {
                console.error("Error fetching claim", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClaim();
    }, [params.id]);

    const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED') => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/hospital/claims/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                const data = await res.json();
                setClaim(prev => prev ? { ...prev, status: data.claim.status } : null);
                openNotice("Berhasil", "Status klaim berhasil diperbarui.");
            } else {
                const errorBody = await res.json().catch(() => null);
                openNotice("Gagal", errorBody?.error || "Gagal memperbarui status klaim.");
            }
        } catch (error) {
            console.error("Error updating claim", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat memperbarui status klaim.");
        } finally {
            setProcessing(false);
            setPendingStatus(null);
        }
    };

    const addField = () => {
        setRequestFields([...requestFields, {
            id: crypto.randomUUID(),
            label: "",
            type: "text",
            required: true,
            options: ""
        }]);
    };

    const updateField = (id: string, key: keyof FormField, value: any) => {
        setRequestFields(fields => fields.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const removeField = (id: string) => {
        setRequestFields(fields => fields.filter(f => f.id !== id));
    };

    const applyTemplate = (template: Omit<FormField, "id">[]) => {
        setRequestFields(
            template.map((field) => ({
                id: crypto.randomUUID(),
                ...field,
                options: field.options || "",
            }))
        );
    };

    const handleSubmitRequest = async () => {
        if (requestFields.length === 0) {
            openNotice("Form Belum Lengkap", "Tambahkan setidaknya satu kolom pertanyaan.");
            return;
        }

        // Validate fields
        for (const field of requestFields) {
            if (!field.label.trim()) {
                openNotice("Form Belum Lengkap", "Label pertanyaan tidak boleh kosong.");
                return;
            }
        }

        setProcessing(true);
        try {
            const res = await fetch(`/api/hospital/claims/${params.id}/request-info`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fields: requestFields.map(f => ({
                        ...f,
                        options: f.type === 'select' ? f.options?.split(',').map(o => o.trim()) : undefined
                    }))
                }),
            });

            if (res.ok) {
                openNotice("Berhasil", "Permintaan data tambahan berhasil dikirim ke agen.");
                setIsRequestOpen(false);
                setRequestFields([]); // Clear fields

                // Refresh data
                const claimRes = await fetch(`/api/hospital/claims/${params.id}`);
                if (claimRes.ok) {
                    const data = await claimRes.json();
                    setClaim(data.claim);
                    setInfoRequests(data.infoRequests || []);
                }
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal mengirim permintaan.");
            }
        } catch (error) {
            console.error("Error sending request", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat mengirim permintaan.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!claim) {
        return <div>Klaim tidak ditemukan.</div>;
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED': return <Badge className="bg-blue-500">Diajukan</Badge>;
            case 'APPROVED': return <Badge className="bg-green-500">Disetujui</Badge>;
            case 'REJECTED': return <Badge variant="destructive">Ditolak</Badge>;
            case 'PAID': return <Badge className="bg-emerald-500">Dibayar</Badge>;
            case 'INFO_REQUESTED': return <Badge className="bg-amber-500">Butuh Info</Badge>;
            case 'INFO_SUBMITTED': return <Badge className="bg-blue-400">Info Diterima</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const parsedNotes = extractClaimNotes(claim.notes);

    const hasPendingInfoRequest = infoRequests.some((req) => req.status !== "COMPLETED");
    const approvalBlockers: string[] = [];

    if (documents.length === 0) {
        approvalBlockers.push("Dokumen pendukung belum diunggah agen.");
    }
    if (hasPendingInfoRequest) {
        approvalBlockers.push("Masih ada permintaan data tambahan yang belum dijawab.");
    }

    const canApprove = approvalBlockers.length === 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/hospital/claims">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Detail Klaim Masuk</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground text-sm">ID: {claim.claim_id}</p>
                        {getStatusBadge(claim.status)}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    {/* Profil Nasabah Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profil Nasabah
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nama Lengkap</p>
                                    <p className="text-base font-semibold">{claim.client_name}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nomor Polis</p>
                                    <p className="text-base font-mono">{claim.policy_number || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">NIK / ID</p>
                                    <p className="text-base">{claim.nik || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tanggal Lahir</p>
                                    <p className="text-base">
                                        {claim.birth_date ? new Date(claim.birth_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Jenis Kelamin</p>
                                    <p className="text-base">
                                        {claim.gender === 'MALE' ? 'Laki-laki' : claim.gender === 'FEMALE' ? 'Perempuan' : "-"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">No. Telepon</p>
                                    <p className="text-base">{claim.phone_number || "-"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Alamat</p>
                                    <p className="text-base">{claim.address || "-"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Informasi Klaim Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Informasi Klaim
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tanggal Kejadian</p>
                                    <p>{new Date(claim.claim_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Rumah Sakit</p>
                                    <p>{claim.hospital_name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Penyakit</p>
                                    <p>{claim.disease_name || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Perkiraan Biaya</p>
                                    <p className="text-lg font-bold text-emerald-600">
                                        {claim.total_amount ?
                                            new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(claim.total_amount)
                                            : "-"}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Catatan</p>
                                <p className="text-sm mt-1">{parsedNotes.plainNotes || "-"}</p>
                            </div>

                            {parsedNotes.meta && (
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Data Form Klaim Terstruktur</p>
                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <p><span className="text-muted-foreground">Kategori:</span> {parsedNotes.meta.claim_category || "-"}</p>
                                        <p><span className="text-muted-foreground">Jenis manfaat:</span> {parsedNotes.meta.benefit_type || "-"}</p>
                                        <p><span className="text-muted-foreground">Penyebab:</span> {parsedNotes.meta.care_cause || "-"}</p>
                                        <p><span className="text-muted-foreground">Awal gejala:</span> {parsedNotes.meta.symptom_onset_date || "-"}</p>
                                        <p><span className="text-muted-foreground">Riwayat perawatan:</span> {parsedNotes.meta.previous_treatment || "-"}</p>
                                        <p><span className="text-muted-foreground">Dokter/RS sebelumnya:</span> {parsedNotes.meta.doctor_hospital_history || "-"}</p>
                                        <p><span className="text-muted-foreground">Alkohol/narkotika:</span> {parsedNotes.meta.alcohol_drug_related || "-"}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Dokumen Pendukung</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {documents.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada dokumen yang diunggah agen.</p>
                                ) : (
                                    documents.map((doc) => (
                                        <div key={doc.document_id} className="flex items-center gap-3 p-3 border rounded-md bg-card">
                                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-medium truncate">
                                                    {doc.file_url.split('/').pop()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                    Lihat
                                                </a>
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Tindakan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {approvalBlockers.length > 0 && ['SUBMITTED', 'INFO_SUBMITTED', 'INFO_REQUESTED'].includes(claim.status) && (
                                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
                                    <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Kelengkapan belum memenuhi aturan RS
                                    </p>
                                    <ul className="text-sm text-amber-800 list-disc ml-5 space-y-1">
                                        {approvalBlockers.map((blocker) => (
                                            <li key={blocker}>{blocker}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {['SUBMITTED', 'INFO_SUBMITTED', 'INFO_REQUESTED'].includes(claim.status) ? (
                                <div className="flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground">
                                        Periksa ringkasan, lalu pilih Setujui atau Tolak.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button
                                            onClick={() => {
                                                if (!canApprove) {
                                                    openNotice("Klaim Belum Bisa Disetujui", "Lengkapi syarat wajib terlebih dahulu.");
                                                    return;
                                                }
                                                setPendingStatus('APPROVED');
                                            }}
                                            disabled={processing || !canApprove}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white relative z-10"
                                        >
                                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                            Setujui
                                        </Button>
                                        <Button
                                            onClick={() => setPendingStatus('REJECTED')}
                                            disabled={processing}
                                            variant="destructive"
                                            className="flex-1 relative z-10"
                                        >
                                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                            Tolak
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">Atau</span>
                                        </div>
                                    </div>

                                    <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="w-full" disabled={claim.status === 'INFO_REQUESTED'}>
                                                <FileQuestion className="mr-2 h-4 w-4" />
                                                {claim.status === 'INFO_REQUESTED' ? 'Permintaan Data Sudah Dikirim' : 'Minta Data Tambahan (Kurang Data)'}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Buat Formulir Permintaan Data</DialogTitle>
                                                <DialogDescription>
                                                    Minta data yang benar-benar diperlukan untuk proses klaim.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs uppercase text-muted-foreground">Template Cepat dari Form Klaim</Label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => applyTemplate(manfaatHidupTemplate)}
                                                        >
                                                            Template Manfaat Hidup
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => applyTemplate(meninggalTemplate)}
                                                        >
                                                            Template Meninggal Dunia
                                                        </Button>
                                                    </div>
                                                </div>

                                                {requestFields.map((field) => (
                                                    <div key={field.id} className="flex gap-4 items-start border p-3 rounded-md bg-slate-50">
                                                        <div className="grid gap-2 flex-1">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="space-y-1">
                                                                    <Label>Label Pertanyaan</Label>
                                                                    <Input
                                                                        value={field.label}
                                                                        onChange={(e) => updateField(field.id, 'label', e.target.value)}
                                                                        placeholder="Contoh: Foto KTP Buram"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label>Tipe Input</Label>
                                                                    <Select
                                                                        value={field.type}
                                                                        onValueChange={(val) => updateField(field.id, 'type', val)}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="text">Teks Singkat</SelectItem>
                                                                            <SelectItem value="number">Angka</SelectItem>
                                                                            <SelectItem value="date">Tanggal</SelectItem>
                                                                            <SelectItem value="select">Pilihan (Dropdown)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>

                                                            {field.type === 'select' && (
                                                                <div className="space-y-1">
                                                                    <Label>Opsi Pilihan (pisahkan dengan koma)</Label>
                                                                    <Input
                                                                        value={field.options}
                                                                        onChange={(e) => updateField(field.id, 'options', e.target.value)}
                                                                        placeholder="Contoh: Ya, Tidak, Mungkin"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => removeField(field.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button variant="outline" onClick={addField} className="w-full border-dashed">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Tambah Pertanyaan
                                                </Button>
                                            </div>

                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsRequestOpen(false)}>Batal</Button>
                                                <Button onClick={handleSubmitRequest} disabled={processing}>
                                                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Kirim Permintaan"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    {claim.status === 'INFO_REQUESTED' ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <FileQuestion className="h-8 w-8 text-amber-500" />
                                            <p>Menunggu respon agen untuk data tambahan.</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            {claim.status === 'APPROVED' && <Check className="h-8 w-8 text-green-500" />}
                                            {claim.status === 'REJECTED' && <X className="h-8 w-8 text-red-500" />}
                                            <p>Klaim ini sudah diproses.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Data Request History */}
                    {infoRequests.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Riwayat Permintaan Data
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {infoRequests.map((req, index) => (
                                    <div key={req.request_id} className="border rounded-lg p-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold text-sm">Permintaan #{infoRequests.length - index}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(req.created_at).toLocaleDateString()} {new Date(req.created_at).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <Badge variant={req.status === 'COMPLETED' ? 'default' : 'outline'}>
                                                {req.status === 'COMPLETED' ? 'Dijawab' : 'Menunggu'}
                                            </Badge>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            {req.form_schema.map((field) => (
                                                <div key={field.id} className="grid grid-cols-1 gap-1">
                                                    <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                                                    <div className="text-sm bg-muted/50 p-2 rounded">
                                                        {req.response_data && req.response_data[field.id] ? (
                                                            <span>{req.response_data[field.id]}</span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic">Belum dijawab</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <ActionModal
                open={pendingStatus !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingStatus(null);
                }}
                title={pendingStatus === "APPROVED" ? "Setujui Klaim" : "Tolak Klaim"}
                description={
                    pendingStatus === "APPROVED"
                        ? "Apakah Anda yakin ingin menyetujui klaim ini?"
                        : "Apakah Anda yakin ingin menolak klaim ini?"
                }
                confirmText={pendingStatus === "APPROVED" ? "Ya, Setujui" : "Ya, Tolak"}
                cancelText="Batal"
                onConfirm={() => {
                    if (!pendingStatus) return;
                    handleUpdateStatus(pendingStatus);
                }}
                destructive={pendingStatus === "REJECTED"}
                loading={processing}
            />
            <ActionModal
                open={notice.open}
                onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
                title={notice.title}
                description={notice.description}
                confirmText="OK"
            />
        </div>
    );
}
