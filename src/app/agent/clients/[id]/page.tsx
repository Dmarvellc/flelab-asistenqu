"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, FileText, Phone, MapPin, Calendar, CreditCard, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ClientDetail = {
    client_id: string;
    full_name: string;
    phone_number: string;
    address: string;
    birth_date: string;
    gender: string;
    id_card: string;
    status: string;
    created_at: string;
};

type Contract = {
    contract_id: string;
    contract_number: string;
    contract_product: string;
    contract_startdate: string;
    contract_duedate: string;
    status: string;
    sum_insured: string;
    payment_type: string;
    policy_url?: string;
};

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [client, setClient] = useState<ClientDetail | null>(null);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientDetail = async () => {
            if (!params.id) return;
            try {
                const res = await fetch(`/api/agent/clients/${params.id}`);
                const data = await res.json();
                if (res.ok) {
                    setClient(data.client);
                    setContracts(data.contracts || []);
                } else {
                    // Handle error (e.g., client not found)
                    console.error(data.error);
                }
            } catch (error) {
                console.error("Failed to fetch client details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClientDetail();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold">Klien tidak ditemukan</h2>
                <Button onClick={() => router.back()}>Kembali</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-gray-50 hover:bg-gray-100 h-10 w-10 shrink-0">
                        <ArrowLeft className="h-4 w-4 text-gray-600" />
                    </Button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border", client.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200')}>
                                {client.status === 'ACTIVE' ? 'Aktif' : client.status}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                                Bergabung {new Date(client.created_at).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-1">
                            {client.full_name}
                        </h2>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Client Profile */}
                <div className="lg:col-span-1 h-fit bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <h3 className="font-semibold text-gray-900 text-base flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" /> Profil Nasabah
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">NIK / KTP</p>
                                <p className="text-[15px] font-medium text-gray-900">{client.id_card || "-"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Tanggal Lahir</p>
                                <p className="text-[15px] text-gray-900">
                                    {client.birth_date ? new Date(client.birth_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Jenis Kelamin</p>
                                <p className="text-[15px] text-gray-900 capitalize">{client.gender?.toLowerCase() || "-"}</p>
                            </div>
                        </div>

                        <Separator className="bg-gray-100" />

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <div className="flex flex-col pt-0.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Kontak</p>
                                    <p className="text-[14px] text-gray-900 font-medium">{client.phone_number || "-"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                                </div>
                                <div className="flex flex-col pt-0.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-0.5">Domisili</p>
                                    <p className="text-[14px] text-gray-900 leading-relaxed">{client.address || "-"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Policies List */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-900 shadow-[0_0_12px_rgba(0,0,0,0.2)]"></div>
                        Daftar Polis Asuransi
                    </h3>

                    {contracts.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-6">
                                <FileText className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="font-bold text-gray-900 text-lg mb-1">Belum ada polis</p>
                            <p className="text-[15px] text-gray-500 max-w-sm">Nasabah ini belum memiliki polis asuransi yang terdaftar di sistem.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {contracts.map((contract) => (
                                <div key={contract.contract_id} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 group">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-xl font-bold text-gray-900 tracking-tight">{contract.contract_product}</h4>
                                                <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border", contract.status === 'ACTIVE' ? "bg-gray-900 text-white border-transparent" : "bg-gray-50 text-gray-500 border-gray-200")}>
                                                    {contract.status === 'ACTIVE' ? 'Aktif' : contract.status}
                                                </span>
                                            </div>
                                            <p className="text-[14px] text-gray-500 font-mono">No. Polis: {contract.contract_number}</p>
                                        </div>
                                        {contract.policy_url && (
                                            <a href={contract.policy_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                <Button variant="outline" size="sm" className="gap-2 rounded-xl border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm">
                                                    <FileText className="h-4 w-4" /> Dokumen Polis
                                                </Button>
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-50">
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" /> Mulai
                                            </p>
                                            <p className="text-[14px] font-semibold text-gray-900">
                                                {contract.contract_startdate ? new Date(contract.contract_startdate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" /> Berakhir
                                            </p>
                                            <p className="text-[14px] font-semibold text-gray-900">
                                                {contract.contract_duedate ? new Date(contract.contract_duedate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <ShieldCheck className="w-3 h-3" /> UP
                                            </p>
                                            <p className="text-[14px] font-semibold text-emerald-600">
                                                Rp {parseInt(contract.sum_insured || "0").toLocaleString("id-ID")}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <CreditCard className="w-3 h-3" /> Term
                                            </p>
                                            <p className="text-[14px] font-semibold text-gray-900 capitalize">
                                                {contract.payment_type?.toLowerCase() || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
