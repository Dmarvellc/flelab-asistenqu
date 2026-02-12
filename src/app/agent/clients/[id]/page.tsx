"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, User, FileText, Phone, MapPin, Calendar, CreditCard, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{client.full_name}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Badge variant={client.status === 'ACTIVE' ? 'default' : 'secondary'} className={client.status === 'ACTIVE' ? 'bg-emerald-500' : ''}>
                            {client.status}
                        </Badge>
                        <span>•</span>
                        <span>Bergabung sejak {new Date(client.created_at).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Client Profile */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-4 h-4" /> Profil Nasabah
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">NIK</p>
                            <p className="text-sm">{client.id_card || "-"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Tanggal Lahir</p>
                            <p className="text-sm">
                                {client.birth_date ? new Date(client.birth_date).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Jenis Kelamin</p>
                            <p className="text-sm capitalize">{client.gender?.toLowerCase() || "-"}</p>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <p className="text-sm">{client.phone_number}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <p className="text-sm">{client.address}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Policies List */}
                <div className="md:col-span-2 space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Daftar Polis Asuransi
                    </h3>

                    {contracts.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mb-4 opacity-20" />
                                <p>Belum ada polis asuransi yang terdaftar.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        contracts.map((contract) => (
                            <Card key={contract.contract_id}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-base">{contract.contract_product}</CardTitle>
                                            <CardDescription>No. Polis: {contract.contract_number}</CardDescription>
                                        </div>
                                        <Badge variant="outline">{contract.status}</Badge>
                                    </div>
                                    {contract.policy_url && (
                                        <div className="mt-2">
                                            <Button variant="outline" size="sm" asChild>
                                                <a href={contract.policy_url} target="_blank" rel="noopener noreferrer">
                                                    <FileText className="mr-2 h-3 w-3" />
                                                    Lihat Polis
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-xs">Mulai</p>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                                <span>{contract.contract_startdate ? new Date(contract.contract_startdate).toLocaleDateString("id-ID") : "-"}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-xs">Berakhir</p>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                                <span>{contract.contract_duedate ? new Date(contract.contract_duedate).toLocaleDateString("id-ID") : "-"}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-xs">Uang Pertanggungan</p>
                                            <div className="flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3 text-muted-foreground" />
                                                <span className="font-medium">Rp {parseInt(contract.sum_insured || "0").toLocaleString("id-ID")}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-muted-foreground text-xs">Pembayaran</p>
                                            <div className="flex items-center gap-1">
                                                <CreditCard className="w-3 h-3 text-muted-foreground" />
                                                <span className="capitalize">{contract.payment_type?.toLowerCase() || "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
