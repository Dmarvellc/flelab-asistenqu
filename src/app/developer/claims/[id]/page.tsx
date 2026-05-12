"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
    Loader2, ArrowLeft, Shield, User, Calendar, 
    Building2, Stethoscope, Banknote, Clock, CheckCircle2, XCircle,
    FileText, Info, AlertCircle, Send
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ClaimTimeline } from "@/components/claims/claim-timeline";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    agency_name: string | null;
    created_by_user_id: string;
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

export default function DeveloperClaimDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [claim, setClaim] = useState<ClaimDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchClaim = async () => {
            try {
                const res = await fetch(`/api/developer/claims/${params.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setClaim(data.claim);
                } else {
                    const data = await res.json();
                    setError(data.error || "Gagal memuat data klaim.");
                }
            } catch (error) {
                console.error("Error fetching claim", error);
                setError("Terjadi kesalahan koneksi.");
            } finally {
                setLoading(false);
            }
        };

        fetchClaim();
    }, [params.id]);

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error || !claim) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold text-red-600">{error || "Klaim tidak ditemukan"}</h2>
                <p className="text-sm text-gray-500">ID: {params.id}</p>
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
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Akses Developer</span>
                        <span className="text-sm font-semibold text-black">Mode Read-Only</span>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none p-0 h-auto space-x-6">
                    <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Overview</TabsTrigger>
                    <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:text-black text-gray-500 bg-transparent px-2 py-3 shadow-none data-[state=active]:shadow-none font-semibold">Timeline & Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm border border-gray-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 sm:p-8">
                            <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 flex flex-col items-end">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Nomor Klaim</span>
                                <span className="text-sm font-semibold text-black">{claim.claim_number || "—"}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                            <Stethoscope className="w-5 h-5 text-gray-500" />
                            <span className="text-xs font-bold text-black uppercase tracking-wider">Detail Medis & Biaya</span>
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-1">{claim.disease_name || "Diagnosis Belum Diisi"}</h2>
                        <p className="text-sm text-gray-400 font-medium mb-8">{claim.hospital_name || "Rumah Sakit Belum Dipilih"}</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                            <Stat label="Total Estimasi Biaya" icon={Banknote} value={idr(claim.total_amount)} />
                            <Stat label="Tanggal Kejadian" icon={Calendar} value={date(claim.claim_date)} />
                            <Stat label="Asuransi" icon={Shield} value={claim.insurance_name} />
                        </div>

                        <Separator className="my-8 opacity-50" />
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                            <Stat label="Agensi" icon={Building2} value={claim.agency_name} />
                            <Stat label="ID User Pembuat" icon={User} value={claim.created_by_user_id.slice(0, 8) + "..."} />
                            <Stat label="Status Sistem" icon={Clock} value={claim.status} />
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
                </TabsContent>

                <TabsContent value="timeline" className="mt-6 space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Timeline */}
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
                                        <p className="text-xs text-black/70">Letter of Guarantee</p>
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
        </div>
    );
}
