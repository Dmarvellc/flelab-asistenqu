
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

type Request = {
    request_id: string;
    person_name: string;
    person_nik: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    additional_data_request: string;
    created_at: string;
    hospital_email: string;
};

export default function AgentRequestsPage() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch("/api/agent/requests");
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    const filtered = requests.filter(r =>
        r.person_name.toLowerCase().includes(search.toLowerCase()) ||
        r.person_nik.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">Permintaan Data Pasien</h2>
                <p className="text-muted-foreground">
                    Daftar permintaan data medis dari Rumah Sakit untuk klien Anda.
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Cari nama atau NIK..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <Card className="bg-muted/50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Tidak ada permintaan</p>
                        <p className="text-sm text-muted-foreground">Belum ada permintaan data dari Rumah Sakit.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filtered.map((req) => (
                        <Card key={req.request_id} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">{req.person_name}</h3>
                                        <Badge variant="outline">{req.person_nik}</Badge>
                                        <Badge className={
                                            req.status === 'PENDING' ? 'bg-yellow-500' :
                                                req.status === 'APPROVED' ? 'bg-blue-500' :
                                                    req.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-500'
                                        }>
                                            {req.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Permintaan: <span className="text-foreground font-medium">{req.additional_data_request}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Oleh: {req.hospital_email} • {new Date(req.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <Button asChild>
                                    <Link href={`/agent/requests/${req.request_id}`}>
                                        Lihat Detail
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
