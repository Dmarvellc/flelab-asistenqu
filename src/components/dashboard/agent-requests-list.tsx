"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Upload, FileText, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Request = {
    request_id: string;
    person_name: string;
    person_nik: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    additional_data_request: string;
    additional_data_file: string | null;
    created_at: string;
    hospital_email: string;
};

export function AgentRequestsList() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const { toast } = useToast();

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/agent/requests");
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

    const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessing(id);
        try {
            const res = await fetch(`/api/agent/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                toast({
                    title: "Berhasil",
                    description: `Permintaan berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}.`,
                });
                fetchRequests();
            } else {
                toast({
                    title: "Gagal",
                    description: "Gagal memperbarui status.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menghubungi server.",
                variant: "destructive",
            });
        } finally {
            setProcessing(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedRequest || !file) return;

        setProcessing(selectedRequest.request_id);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`/api/agent/requests/${selectedRequest.request_id}/upload`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                toast({
                    title: "Berhasil",
                    description: "Dokumen berhasil diunggah.",
                });
                setUploadOpen(false);
                setFile(null);
                fetchRequests();
            } else {
                const err = await res.json();
                toast({
                    title: "Gagal",
                    description: err.error || "Gagal mengunggah dokumen.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Gagal menghubungi server.",
                variant: "destructive",
            });
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return <div className="text-center p-4">Memuat permintaan...</div>;
    }

    if (requests.length === 0) {
        return null; // Don't show if no requests? Or show empty state?
    }

    const pendingRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');

    if (pendingRequests.length === 0) return null;

    return (
        <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-500" />
                    Permintaan Data Pasien
                </CardTitle>
                <CardDescription>
                    Permintaan data dari Rumah Sakit yang perlu Anda tinjau.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {pendingRequests.map((req) => (
                        <div key={req.request_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-white shadow-sm gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold">{req.person_name}</span>
                                    <Badge variant="outline">{req.person_nik}</Badge>
                                    <Badge className={
                                        req.status === 'PENDING' ? 'bg-yellow-500' :
                                            req.status === 'APPROVED' ? 'bg-blue-500' : 'bg-gray-500'
                                    }>
                                        {req.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                    <span className="font-medium text-black">Permintaan:</span> {req.additional_data_request}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Dari: {req.hospital_email} • {new Date(req.created_at).toLocaleDateString("id-ID")}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">

                                {req.status === 'PENDING' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => handleStatusUpdate(req.request_id, 'REJECTED')}
                                            disabled={!!processing}
                                        >
                                            {processing === req.request_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                                            Tolak
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleStatusUpdate(req.request_id, 'APPROVED')}
                                            disabled={!!processing}
                                        >
                                            {processing === req.request_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                            Setujui
                                        </Button>
                                    </>
                                )}
                                {req.status === 'APPROVED' && (
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                            setSelectedRequest(req);
                                            setUploadOpen(true);
                                        }}
                                    >
                                        <Upload className="h-4 w-4 mr-1" />
                                        Upload Data
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Dokumen</DialogTitle>
                            <DialogDescription>
                                Upload file yang diminta untuk <strong>{selectedRequest?.person_name}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="file">File (PDF, Doc, Image - Max 10MB)</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
                            <Button onClick={handleUpload} disabled={!file || !!processing}>
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
