"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send, AlertCircle, Trash2, Edit2, Upload, FileText, X, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    disease_name: string;
    hospital_name: string;
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
};

type Document = {
    document_id: string;
    file_url: string;
    created_at: string;
};

type NoticeState = {
    open: boolean;
    title: string;
    description: string;
    onClose?: () => void;
};

export default function ClaimDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [claim, setClaim] = useState<ClaimDetail | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingAction, setPendingAction] = useState<null | "submit" | "delete">(null);
    const [notice, setNotice] = useState<NoticeState>({
        open: false,
        title: "",
        description: "",
    });

    // Info Request State
    const [infoRequest, setInfoRequest] = useState<InfoRequest | null>(null);
    const [responses, setResponses] = useState<Record<string, any>>({});

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        total_amount: "",
        notes: "",
        claim_date: "",
    });

    useEffect(() => {
        const fetchClaim = async () => {
            try {
                const res = await fetch(`/api/agent/claims/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    const parsed = extractClaimNotes(data.claim.notes);
                    setClaim(data.claim);
                    setEditForm({
                        total_amount: data.claim.total_amount?.toString() || "",
                        notes: parsed.plainNotes || "",
                        claim_date: data.claim.claim_date ? new Date(data.claim.claim_date).toISOString().split('T')[0] : "",
                    });

                    // If status is INFO_REQUESTED, fetch the request details
                    if (data.claim.status === 'INFO_REQUESTED') {
                        const reqRes = await fetch(`/api/agent/claims/${params.id}/info-request`);
                        if (reqRes.ok) {
                            const reqData = await reqRes.json();
                            setInfoRequest(reqData.request);
                        }
                    }
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

    const openNotice = (title: string, description: string, onClose?: () => void) => {
        setNotice({ open: true, title, description, onClose });
    };

    const executeSubmitClaim = async () => {
        setPendingAction(null);
        if (documents.length === 0) {
            openNotice("Dokumen Belum Lengkap", "Minimal 1 dokumen pendukung wajib diunggah sebelum klaim diajukan.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "SUBMITTED" }),
            });

            if (res.ok) {
                const data = await res.json();
                setClaim(prev => prev ? { ...prev, status: data.claim.status } : null);
                openNotice("Berhasil", "Klaim berhasil diajukan.");
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal mengajukan klaim.");
            }
        } catch (error) {
            console.error("Error submitting claim", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat mengajukan klaim.");
        } finally {
            setSubmitting(false);
        }
    };

    const executeDeleteClaim = async () => {
        setPendingAction(null);
        setSubmitting(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                openNotice("Berhasil", "Klaim berhasil dihapus.", () => router.push("/agent/claims"));
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal menghapus klaim.");
            }
        } catch (error) {
            console.error("Error deleting claim", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat menghapus klaim.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateClaim = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    total_amount: parseFloat(editForm.total_amount),
                    notes: editForm.notes,
                    claim_date: editForm.claim_date,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setClaim(prev => prev ? { ...prev, ...data.claim } : null);
                setIsEditOpen(false);
                openNotice("Berhasil", "Klaim berhasil diperbarui.");
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal memperbarui klaim.");
            }
        } catch (error) {
            console.error("Error updating claim", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat memperbarui klaim.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}/documents`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setDocuments(prev => [data.document, ...prev]);
                openNotice("Berhasil", "Dokumen berhasil diunggah.");
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal mengunggah dokumen.");
            }
        } catch (error) {
            console.error("Error uploading document", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat mengunggah dokumen.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleSubmitInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!infoRequest) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}/info-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request_id: infoRequest.request_id,
                    responses
                }),
            });

            if (res.ok) {
                openNotice("Berhasil", "Data tambahan berhasil dikirim.", () => window.location.reload());
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal mengirim data tambahan.");
            }
        } catch (error) {
            console.error("Error submitting info", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat mengirim data tambahan.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleInputChange = (id: string, value: any) => {
        setResponses(prev => ({
            ...prev,
            [id]: value
        }));
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
            case 'DRAFT': return <Badge variant="outline">Draft</Badge>;
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/agent/claims">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Detail Klaim</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-muted-foreground text-sm">ID: {claim.claim_id}</p>
                            {getStatusBadge(claim.status)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {claim.status === 'DRAFT' && (
                        <>
                            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Edit Klaim</DialogTitle>
                                        <DialogDescription>
                                            Ubah detail klaim ini.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Tanggal Kejadian</Label>
                                            <Input
                                                type="date"
                                                value={editForm.claim_date}
                                                onChange={(e) => setEditForm({ ...editForm, claim_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Perkiraan Biaya</Label>
                                            <Input
                                                type="number"
                                                value={editForm.total_amount}
                                                onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Catatan</Label>
                                            <Textarea
                                                value={editForm.notes}
                                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
                                        <Button onClick={handleUpdateClaim} disabled={submitting}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button
                                onClick={() => {
                                    if (documents.length === 0) {
                                        openNotice("Dokumen Belum Lengkap", "Minimal 1 dokumen pendukung wajib diunggah sebelum klaim diajukan.");
                                        return;
                                    }
                                    setPendingAction("submit");
                                }}
                                disabled={submitting}
                                variant="default"
                            >
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Ajukan Klaim
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPendingAction("delete")} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
            </div>

            {claim.status === 'INFO_REQUESTED' && infoRequest && (
                <div className="rounded-md border border-amber-500 bg-amber-50 p-4">
                    <p className="text-amber-800 font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        Permintaan Data Tambahan
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                        Ada data tambahan yang perlu dilengkapi agar klaim bisa diproses.
                    </p>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Informasi Klaim</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Nasabah</p>
                                <p className="text-lg font-semibold">{claim.client_name}</p>
                            </div>
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
                                <p className="text-sm font-medium text-muted-foreground mb-2">Data Form Klaim</p>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                    <p><span className="text-muted-foreground">Kategori:</span> {parsedNotes.meta.claim_category || "-"}</p>
                                    <p><span className="text-muted-foreground">Jenis manfaat:</span> {parsedNotes.meta.benefit_type || "-"}</p>
                                    <p><span className="text-muted-foreground">Penyebab:</span> {parsedNotes.meta.care_cause || "-"}</p>
                                    <p><span className="text-muted-foreground">Awal gejala:</span> {parsedNotes.meta.symptom_onset_date || "-"}</p>
                                    <p><span className="text-muted-foreground">Alkohol/narkotika:</span> {parsedNotes.meta.alcohol_drug_related || "-"}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {claim.status === 'INFO_REQUESTED' ? "Respon Permintaan Data" : "Dokumen Pendukung"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {claim.status === 'INFO_REQUESTED' && infoRequest ? (
                            <form onSubmit={handleSubmitInfo} className="space-y-4">
                                {infoRequest.form_schema.map((field) => (
                                    <div key={field.id} className="space-y-2">
                                        <Label htmlFor={field.id}>
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </Label>

                                        {field.type === 'select' ? (
                                            <Select
                                                onValueChange={(val) => handleInputChange(field.id, val)}
                                                required={field.required}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {field.options?.map((opt) => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id={field.id}
                                                type={field.type}
                                                required={field.required}
                                                onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                                <Button type="submit" className="w-full" disabled={submitting}>
                                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Kirim Data Tambahan
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                {claim.status === 'DRAFT' && (
                                    <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
                                        <p className="font-medium">Checklist minimal sebelum pengajuan</p>
                                        <ul className="list-disc ml-5 text-muted-foreground space-y-1">
                                            <li>Unggah dokumen utama klaim dan lampiran medis.</li>
                                            <li>Pastikan tanggal kejadian, RS, dan diagnosis sudah benar.</li>
                                            <li>Isi catatan singkat hanya untuk informasi penting.</li>
                                        </ul>
                                    </div>
                                )}

                                {claim.status === 'DRAFT' && (
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            {uploading ? (
                                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                            ) : (
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                            )}
                                            <p className="text-sm font-medium">
                                                {uploading ? "Mengunggah..." : "Klik untuk unggah dokumen"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 5MB)</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {documents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">Belum ada dokumen.</p>
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
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ActionModal
                open={pendingAction === "submit"}
                onOpenChange={(open) => {
                    if (!open) setPendingAction(null);
                }}
                title="Ajukan Klaim"
                description="Apakah Anda yakin ingin mengajukan klaim ini ke Rumah Sakit?"
                confirmText="Ya, Ajukan"
                cancelText="Batal"
                onConfirm={executeSubmitClaim}
                loading={submitting}
            />
            <ActionModal
                open={pendingAction === "delete"}
                onOpenChange={(open) => {
                    if (!open) setPendingAction(null);
                }}
                title="Hapus Klaim"
                description="Apakah Anda yakin ingin menghapus klaim ini? Tindakan ini tidak dapat dibatalkan."
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onConfirm={executeDeleteClaim}
                destructive
                loading={submitting}
            />
            <ActionModal
                open={notice.open}
                onOpenChange={(open) => {
                    setNotice((prev) => ({ ...prev, open }));
                    if (!open && notice.onClose) {
                        notice.onClose();
                    }
                }}
                title={notice.title}
                description={notice.description}
                confirmText="OK"
            />
        </div>
    );
}
