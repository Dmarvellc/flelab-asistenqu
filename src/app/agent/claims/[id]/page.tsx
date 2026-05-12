"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
    Loader2, ArrowLeft, Send, AlertCircle, Trash2, Edit2, Upload, 
    FileText, MoreVertical, Download, Shield, User, Calendar, 
    Building2, Stethoscope, Banknote, Clock, CheckCircle2, XCircle,
    History, MessageSquare, Info
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { extractClaimNotes } from "@/lib/claim-form-meta";
import { ActionModal } from "@/components/ui/action-modal";
import { cn } from "@/lib/utils";
import { ClaimTimeline } from "@/components/claims/claim-timeline";
import { Separator } from "@/components/ui/separator";

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

/* ─── Helpers ─────────────────────────────────────────────── */
const idr = (v?: string | number | null) => {
    const n = typeof v === "number" ? v : parseFloat(v || "0");
    return isNaN(n) || n === 0 ? "—" : "Rp " + n.toLocaleString("id-ID");
};
const date = (v?: string) => v ? new Date(v).toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" }) : "—";

function Stat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-sm font-semibold text-black">{value || "—"}</p>
        </div>
    );
}

function getStatusConfig(status: string) {
    switch (status) {
        case "APPROVED":
            return {
                className: "bg-white text-emerald-700 border-emerald-200",
                icon: <CheckCircle2 className="h-3 w-3" />,
                label: "Disetujui",
            };
        case "INFO_REQUESTED":
            return {
                className: "bg-white text-amber-700 border-amber-200",
                icon: <AlertCircle className="h-3 w-3" />,
                label: "Perlu Info",
            };
        case "INFO_SUBMITTED":
            return {
                className: "bg-white text-blue-700 border-blue-200",
                icon: <Info className="h-3 w-3" />,
                label: "Info Terkirim",
            };
        case "REJECTED":
            return {
                className: "bg-red-50 text-red-700 border-red-200",
                icon: <XCircle className="h-3 w-3" />,
                label: "Ditolak",
            };
        case "DRAFT":
            return {
                className: "bg-gray-50 text-gray-600 border-gray-200",
                icon: <FileText className="h-3 w-3" />,
                label: "Draft",
            };
        default:
            return {
                className: "bg-white text-black border-gray-200",
                icon: <Clock className="h-3 w-3" />,
                label: status,
            };
    }
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

                    if (data.claim.status === 'INFO_REQUESTED') {
                        const reqRes = await fetch(`/api/agent/claims/${params.id}/info-request`);
                        if (reqRes.ok) {
                            const reqData = await reqRes.json();
                            setInfoRequest(reqData.request);
                        }
                    }
                }

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
        }
    };

    const handleInfoSubmit = async () => {
        if (!infoRequest) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/agent/claims/${params.id}/info-request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responses }),
            });

            if (res.ok) {
                setClaim(prev => prev ? { ...prev, status: 'INFO_SUBMITTED' } : null);
                setInfoRequest(null);
                openNotice("Berhasil", "Informasi tambahan berhasil dikirim.");
            } else {
                const err = await res.json().catch(() => null);
                openNotice("Gagal", err?.error || "Gagal mengirim informasi.");
            }
        } catch (error) {
            console.error("Error submitting info", error);
            openNotice("Kesalahan Sistem", "Terjadi kesalahan saat mengirim informasi.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (!claim) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold">Klaim tidak ditemukan</h2>
                <Button onClick={() => router.back()}>Kembali</Button>
            </div>
        );
    }

    const statusConfig = getStatusConfig(claim.status);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full max-w-6xl mx-auto pb-16">
            {/* ── Header ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-4 min-w-0">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-md shrink-0 h-10 w-10">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5", statusConfig.className)}>
                                {statusConfig.icon}
                                {statusConfig.label}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                Dibuat {new Date(claim.created_at).toLocaleDateString("id-ID", { month:"long", year:"numeric" })}
                            </span>
                            <span className="text-xs text-gray-500 font-semibold">Tahap: {claim.stage}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">{claim.client_name}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(claim.status === 'DRAFT' || claim.status === 'INFO_REQUESTED') && (
                        <Button 
                            onClick={() => setPendingAction("submit")} 
                            disabled={submitting}
                            className="gap-2 rounded-md bg-black hover:bg-black text-white"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Ajukan Klaim
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-md h-10 w-10">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-md">
                            <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="gap-2">
                                <Edit2 className="w-4 h-4" /> Edit Klaim
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPendingAction("delete")} className="gap-2 text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4" /> Hapus Klaim
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none p-0 h-auto space-x-6">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Overview</TabsTrigger>
                    <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Documents</TabsTrigger>
                    <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Timeline & Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Main Info Card */}
                        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200 relative overflow-hidden flex-1">
                            <div className="absolute top-0 right-0 p-6 sm:p-8">
                                <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Nomor Klaim</span>
                                    <span className="text-sm font-semibold text-black">{claim.claim_number || "—"}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-2">
                                <Stethoscope className="w-5 h-5 text-gray-500" />
                                <span className="text-xs font-bold text-black uppercase tracking-wider">Detail Medis & Biaya</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-black mb-1">{claim.disease_name || "Diagnosis Belum Diisi"}</h2>
                            <p className="text-sm text-gray-400 font-medium mb-8">{claim.hospital_name || "Rumah Sakit Belum Dipilih"}</p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <Stat label="Total Estimasi Biaya" icon={Banknote} value={idr(claim.total_amount)} />
                                <Stat label="Tanggal Kejadian" icon={Calendar} value={date(claim.claim_date)} />
                                <Stat label="Asuransi" icon={Shield} value={claim.insurance_name} />
                            </div>

                            {claim.notes && (
                                <>
                                    <Separator className="my-8 opacity-50" />
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Catatan Tambahan</span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-md border border-gray-200/50">
                                            {claim.notes}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Info Request Section */}
                        {infoRequest && (
                            <div className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200 animate-in slide-in-from-top-2 duration-500">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-amber-700">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-amber-900">Permintaan Informasi Tambahan</h3>
                                        <p className="text-xs text-amber-700/70">Mohon lengkapi data berikut</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {infoRequest.form_schema.map((field) => (
                                        <div key={field.id} className="space-y-2">
                                            <Label className="text-sm font-semibold text-amber-900">{field.label} {field.required && "*"}</Label>
                                            {field.type === 'select' ? (
                                                <Select onValueChange={(v) => setResponses(r => ({ ...r, [field.id]: v }))}>
                                                    <SelectTrigger className="bg-white border-amber-200 rounded-md">
                                                        <SelectValue placeholder={`Pilih ${field.label}`} />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-md">
                                                        {field.options?.map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input
                                                    type={field.type}
                                                    className="bg-white border-amber-200 rounded-md"
                                                    onChange={(e) => setResponses(r => ({ ...r, [field.id]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <Button 
                                        onClick={handleInfoSubmit} 
                                        disabled={submitting}
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-md h-12 font-bold"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kirim Informasi"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                    {/* Documents Section */}
                    <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-md bg-black flex items-center justify-center text-white shadow-sm shadow-gray-200">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-black">Dokumen Pendukung</h3>
                                    <p className="text-xs text-gray-400">{documents.length} file terunggah</p>
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                                <Button 
                                    asChild 
                                    variant="outline" 
                                    className="rounded-md gap-2 border-gray-200 hover:bg-gray-50"
                                    disabled={uploading}
                                >
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Unggah File
                                    </label>
                                </Button>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.map((doc) => (
                                <div key={doc.document_id} className="group flex items-center justify-between p-4 rounded-md bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-black truncate">Dokumen Klaim</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">{date(doc.created_at)}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" asChild className="rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                                            <Download className="w-4 h-4 text-gray-500" />
                                        </a>
                                    </Button>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <div className="col-span-full py-12 text-center bg-white rounded-lg border border-dashed border-gray-200">
                                    <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Belum ada dokumen pendukung</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Timeline Card */}
                        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200">
                            <ClaimTimeline claimId={claim.claim_id} />
                        </div>

                        {/* Log Info Card */}
                        {(claim.log_number || claim.log_issued_at) && (
                            <div className="bg-white rounded-lg p-6 sm:p-8 border border-gray-200 h-fit">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-black">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-black">Informasi LOG</h3>
                                        <p className="text-xs text-gray-500">Letter of Guarantee</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <Stat label="Nomor LOG" icon={FileText} value={claim.log_number} />
                                    <Stat label="Diterbitkan" icon={Calendar} value={date(claim.log_issued_at || "")} />
                                    <Stat label="Dikirim ke RS" icon={Send} value={date(claim.log_sent_to_hospital_at || "")} />
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <ActionModal
                open={pendingAction !== null}
                onOpenChange={(open) => { if (!open) setPendingAction(null); }}
                onConfirm={pendingAction === "submit" ? executeSubmitClaim : executeDeleteClaim}
                title={pendingAction === "submit" ? "Ajukan Klaim?" : "Hapus Klaim?"}
                description={pendingAction === "submit" 
                    ? "Pastikan semua dokumen sudah lengkap. Klaim akan dikirim untuk diproses lebih lanjut." 
                    : "Tindakan ini tidak dapat dibatalkan. Seluruh data klaim akan dihapus permanen."}
                confirmText={pendingAction === "submit" ? "Ya, Ajukan" : "Ya, Hapus"}
                destructive={pendingAction !== "submit"}
                loading={submitting}
            />

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="rounded-lg max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Informasi Klaim</DialogTitle>
                        <DialogDescription>Perbarui estimasi biaya atau catatan klaim.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Estimasi Total Biaya</Label>
                            <Input 
                                type="number" 
                                value={editForm.total_amount} 
                                onChange={e => setEditForm(f => ({ ...f, total_amount: e.target.value }))}
                                className="rounded-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Kejadian</Label>
                            <Input 
                                type="date" 
                                value={editForm.claim_date} 
                                onChange={e => setEditForm(f => ({ ...f, claim_date: e.target.value }))}
                                className="rounded-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Catatan</Label>
                            <Textarea 
                                value={editForm.notes} 
                                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                className="rounded-md min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-md">Batal</Button>
                        <Button onClick={handleUpdateClaim} disabled={submitting} className="rounded-md bg-black hover:bg-black">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Perubahan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={notice.open} onOpenChange={(o) => !o && setNotice(n => ({ ...n, open: false }))}>
                <DialogContent className="rounded-lg max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{notice.title}</DialogTitle>
                        <DialogDescription className="pt-2">{notice.description}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button 
                            onClick={() => {
                                setNotice(n => ({ ...n, open: false }));
                                notice.onClose?.();
                            }}
                            className="w-full rounded-md bg-black hover:bg-black"
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
