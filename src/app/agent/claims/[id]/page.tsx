"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Send, AlertCircle, Trash2, Edit2, Upload, FileText, MoreVertical, Download, Shield, User, Calendar, Building2, Stethoscope, Banknote, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";


type ClaimDetail = {
    claim_id: string;
    claim_number: string | null;
    claim_date: string;
    status: string;
    stage: string;
    total_amount: number;
    notes: string;
    client_name: string;
    disease_name: string;
    hospital_name: string;
    created_at: string;
    log_number: string | null;
    log_issued_at: string | null;
    log_sent_to_hospital_at: string | null;
    insurance_name: string | null;
    insurance_contact: string | null;
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

function FieldRow({ label, icon: Icon, value }: { label: string; icon: React.ElementType; value: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 sm:w-48 shrink-0">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm text-gray-900", !value && "text-gray-400 italic")}>
                    {value || "Belum diisi"}
                </p>
            </div>
        </div>
    );
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        const action = claim?.stage === 'PENDING_AGENT' ? 'SUBMIT_TO_AGENCY' : 'SEND_TO_HOSPITAL';

        setSubmitting(true);
        try {
            const res = await fetch(`/api/claims/${params.id}/workflow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: action,
                    notes: "Diajukan oleh Agen"
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setClaim(prev => prev ? { ...prev, status: data.newStatus, stage: data.newStage } : null);
                openNotice("Berhasil", action === 'SUBMIT_TO_AGENCY' ? "Klaim berhasil diajukan ke Agensi." : "Klaim berhasil dikirim ke Rumah Sakit.");
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInputChange = (id: string, value: any) => {
        setResponses(prev => ({
            ...prev,
            [id]: value
        }));
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                    <p className="text-sm text-gray-400">Memuat detail klaim...</p>
                </div>
            </div>
        );
    }

    if (!claim) {
        return <div className="text-sm text-gray-500 py-10 text-center">Klaim tidak ditemukan.</div>;
    }

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'DRAFT': return "bg-gray-100 text-gray-600 border-gray-200";
            case 'SUBMITTED': return "bg-blue-50 text-blue-700 border-blue-200";
            case 'APPROVED': return "bg-green-50 text-green-700 border-green-200";
            case 'REJECTED': return "bg-red-50 text-red-700 border-red-200";
            case 'PAID': return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case 'INFO_REQUESTED': return "bg-amber-50 text-amber-700 border-amber-200";
            case 'INFO_SUBMITTED': return "bg-blue-50 text-blue-700 border-blue-200";
            default: return "bg-gray-50 text-gray-600 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'DRAFT': return "Draft";
            case 'SUBMITTED': return "Diajukan";
            case 'APPROVED': return "Disetujui";
            case 'REJECTED': return "Ditolak";
            case 'PAID': return "Dibayar";
            case 'INFO_REQUESTED': return "Butuh Info";
            case 'INFO_SUBMITTED': return "Info Diterima";
            default: return status;
        }
    };

    const parsedNotes = extractClaimNotes(claim.notes);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <Link href="/agent/claims">
                        <Button variant="ghost" size="icon" className="rounded-full bg-gray-50 hover:bg-gray-100 h-10 w-10 shrink-0">
                            <ArrowLeft className="h-4 w-4 text-gray-600" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", getStatusStyle(claim.status))}>
                                {getStatusLabel(claim.status)}
                            </span>
                            {claim.log_number && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
                                    <Shield className="h-3 w-3" />
                                    LOG: {claim.log_number}
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-2">
                            {claim.claim_number || `Klaim #${claim.claim_id.slice(0, 8)}`}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl h-10 px-4 border-gray-200 shadow-sm text-gray-700 bg-white"
                        onClick={() => window.open(`/agent/claims/${params.id}/print`, '_blank')}
                    >
                        <Download className="h-4 w-4" />
                        PDF
                    </Button>

                    {claim.status === 'DRAFT' && (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 border-gray-200 shadow-sm bg-white hover:bg-gray-50 text-gray-700">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-gray-100">
                                    <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2 p-2.5 cursor-pointer">
                                        <Edit2 className="h-4 w-4" /> Edit Detail
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPendingAction("delete")} className="text-red-500 focus:text-red-600 gap-2 p-2.5 cursor-pointer focus:bg-red-50 mt-1">
                                        <Trash2 className="h-4 w-4" /> Hapus Klaim
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                onClick={() => {
                                    if (documents.length === 0) {
                                        openNotice("Dokumen Belum Lengkap", "Minimal 1 dokumen pendukung wajib diunggah sebelum klaim diajukan.");
                                        return;
                                    }
                                    setPendingAction("submit");
                                }}
                                disabled={submitting}
                                className={cn(
                                    "gap-2 rounded-xl h-10 px-5 shadow-sm text-sm font-medium transition-all ml-1",
                                    claim?.stage === 'PENDING_AGENT'
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        : "bg-black hover:bg-gray-900 text-white"
                                )}
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {claim?.stage === 'PENDING_AGENT' ? "Ajukan ke Agensi" : "Kirim ke RS"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Alert: Info Requested */}
            {claim.status === 'INFO_REQUESTED' && infoRequest && (
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-amber-900">Permintaan Data Tambahan</h3>
                        <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                            Rumah sakit atau tim medis memerlukan informasi tambahan untuk melanjutkan proses klaim ini. Silakan lengkapi formulir di bagian "Kebutuhan Data" di bawah.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-8">
                    {/* section: Info Utama */}
                    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="font-semibold text-gray-900 text-base">Informasi Utama</h3>
                        </div>
                        <div className="px-6 py-2">
                            <FieldRow label="Nasabah" icon={User} value={<span className="font-medium">{claim.client_name}</span>} />
                            <FieldRow label="Tanggal Kejadian" icon={Calendar} value={new Date(claim.claim_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })} />
                            <FieldRow label="Rumah Sakit" icon={Building2} value={claim.hospital_name} />
                            <FieldRow label="Diagnosis / Penyakit" icon={Stethoscope} value={claim.disease_name} />
                            <FieldRow
                                label="Perkiraan Biaya"
                                icon={Banknote}
                                value={claim.total_amount ? <span className="text-lg font-bold text-emerald-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(claim.total_amount)}</span> : undefined}
                            />
                            <FieldRow label="Catatan Tambahan" icon={FileText} value={parsedNotes.plainNotes} />
                        </div>
                    </div>

                    {/* section: Meta Form */}
                    {parsedNotes.meta && (
                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                <h3 className="font-semibold text-gray-900 text-base">Detail Medis Awal</h3>
                            </div>
                            <div className="px-6 py-2">
                                <FieldRow label="Kategori" icon={FileText} value={parsedNotes.meta.claim_category} />
                                <FieldRow label="Jenis Manfaat" icon={FileText} value={parsedNotes.meta.benefit_type} />
                                <FieldRow label="Penyebab Perawatan" icon={FileText} value={parsedNotes.meta.care_cause} />
                                <FieldRow label="Awal Gejala" icon={Clock} value={parsedNotes.meta.symptom_onset_date} />
                                <FieldRow label="Terkait Narkotika" icon={AlertCircle} value={parsedNotes.meta.alcohol_drug_related} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Uploads / Actions */}
                <div className="space-y-6">
                    {claim.status === 'INFO_REQUESTED' && infoRequest ? (
                        <div className="bg-white rounded-3xl border border-amber-200 overflow-hidden shadow-sm">
                            <div className="px-6 py-5 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <div>
                                    <h3 className="font-semibold text-amber-900 text-sm">Kebutuhan Data</h3>
                                    <p className="text-[10px] text-amber-700/70 mt-0.5 uppercase tracking-widest font-bold">Wajib diisi</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleSubmitInfo} className="space-y-5">
                                    {infoRequest.form_schema.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <Label htmlFor={field.id} className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </Label>
                                            {field.type === 'select' ? (
                                                <Select
                                                    onValueChange={(val) => handleInputChange(field.id, val)}
                                                    required={field.required}
                                                >
                                                    <SelectTrigger className="rounded-xl border-gray-200 text-sm h-11">
                                                        <SelectValue placeholder="Pilih opsi..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
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
                                                    className="rounded-xl border-gray-200 text-sm h-11"
                                                    placeholder={`Ketik ${field.label.toLowerCase()}...`}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <Button type="submit" className="w-full rounded-xl h-11 bg-black hover:bg-gray-900 text-white shadow-md font-medium mt-4 transition-all active:scale-[0.98]" disabled={submitting}>
                                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Kirim Respon
                                    </Button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                <h3 className="font-semibold text-gray-900 text-base">Dokumen File</h3>
                                <span className="bg-gray-200/60 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-md">{documents.length} File</span>
                            </div>
                            <div className="p-6 space-y-5">
                                {claim.status === 'DRAFT' && (
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 relative flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors group cursor-pointer bg-white">
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                        />
                                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 group-hover:scale-110 shadow-sm border border-gray-100 transition-transform">
                                            {uploading ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                                            ) : (
                                                <Upload className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                        <h4 className="font-medium text-sm text-gray-900">
                                            {uploading ? "Sabar, mengunggah..." : "Tambah Dokumen"}
                                        </h4>
                                        <p className="text-[11px] text-gray-400 mt-1 max-w-[200px]">PDF, JPG, PNG &bull; Maks 5MB</p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {documents.length === 0 ? (
                                        claim.status !== 'DRAFT' ? (
                                            <div className="text-center py-6">
                                                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                                                <p className="text-xs text-gray-400">Belum ada dokumen tertaut</p>
                                            </div>
                                        ) : null
                                    ) : (
                                        documents.map((doc) => (
                                            <a
                                                key={doc.document_id}
                                                href={doc.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/30 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer relative"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-gray-100 group-hover:shadow-sm transition-all">
                                                        <FileText className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-black transition-colors">
                                                            {doc.file_url.split('/').pop()}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">
                                                            {new Date(doc.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:flex h-8 w-8 bg-white border border-gray-100 rounded-lg shrink-0 items-center justify-center text-gray-300 group-hover:text-black group-hover:border-gray-300 transition-colors shadow-sm">
                                                    <Download className="h-3.5 w-3.5" />
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog Edit */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="rounded-3xl border border-gray-100 shadow-2xl overflow-hidden sm:max-w-md p-0">
                    <div className="px-6 py-5 border-b border-gray-100 bg-white">
                        <DialogTitle className="text-xl font-bold">Edit Detail Klaim</DialogTitle>
                        <DialogDescription className="text-xs mt-1 text-gray-500">
                            Masukan tagihan kasar perkiraan untuk RS
                        </DialogDescription>
                    </div>
                    <div className="p-6 space-y-5 bg-gray-50/30">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tanggal Kejadian</Label>
                            <Input
                                type="date"
                                className="rounded-xl border-gray-200 h-11"
                                value={editForm.claim_date}
                                onChange={(e) => setEditForm({ ...editForm, claim_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Perkiraan Biaya (Rp)</Label>
                            <Input
                                type="number"
                                className="rounded-xl border-gray-200 font-mono h-11"
                                value={editForm.total_amount}
                                onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Catatan</Label>
                            <Textarea
                                className="rounded-xl border-gray-200 min-h-[100px] resize-none"
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Tambahkan informasi pendukung opsional di sini..."
                            />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl font-medium text-gray-500 hover:text-gray-900">Batal Edit</Button>
                        <Button onClick={handleUpdateClaim} disabled={submitting} className="rounded-xl bg-black hover:bg-gray-900 font-medium px-6 h-10 shadow-md transition-all active:scale-95">
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Simpan Perubahaan"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ActionModal
                open={pendingAction === "submit"}
                onOpenChange={(open) => {
                    if (!open) setPendingAction(null);
                }}
                title={claim?.stage === 'PENDING_AGENT' ? "Ajukan ke Agensi" : "Kirim ke Rumah Sakit"}
                description={claim?.stage === 'PENDING_AGENT' ? "Pastikan berkas medis telah dilampirkan. Yakin lanjutkan ke Agensi Asuransi?" : "Apakah dokumen pendukung sudah diunggah seluruhnya dan siap diproses Rumah Sakit?"}
                confirmText={claim?.stage === 'PENDING_AGENT' ? "Ya, Ajukan Final" : "Kirim & Proses"}
                cancelText="Kembali"
                onConfirm={executeSubmitClaim}
                loading={submitting}
            />
            <ActionModal
                open={pendingAction === "delete"}
                onOpenChange={(open) => {
                    if (!open) setPendingAction(null);
                }}
                title="Hapus Pengajuan"
                description="Hapus klaim yang berstatus 'Draft' ini tidak dapat dipulihkan dan fail yang di upload akan terbuang."
                confirmText="Ya, Hapus Permanen"
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
                confirmText="OKE"
            />
        </div>
    );
}
