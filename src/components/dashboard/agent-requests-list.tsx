"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Upload, FileText, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
                toast({ title: "Berhasil", description: `Permintaan berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}.` });
                fetchRequests();
            } else {
                toast({ title: "Gagal", description: "Gagal memperbarui status.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Gagal menghubungi server.", variant: "destructive" });
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
                toast({ title: "Berhasil", description: "Dokumen berhasil diunggah." });
                setUploadOpen(false);
                setFile(null);
                fetchRequests();
            } else {
                const err = await res.json();
                toast({ title: "Gagal", description: err.error || "Gagal mengunggah dokumen.", variant: "destructive" });
            }
        } catch {
            toast({ title: "Error", description: "Gagal menghubungi server.", variant: "destructive" });
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return null;

    const pendingRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');
    if (pendingRequests.length === 0) return null;

    return (
        <>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="h-8 w-8 rounded-xl bg-gray-900 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Permintaan Data Pasien</h3>
                        <p className="text-xs text-gray-400">{pendingRequests.length} permintaan aktif dari Rumah Sakit</p>
                    </div>
                    <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black text-white text-xs font-bold px-2">
                        {pendingRequests.length}
                    </span>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-50">
                    {pendingRequests.map((req) => (
                        <div key={req.request_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 gap-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm mt-0.5",
                                    req.status === 'PENDING' ? "bg-black" : "bg-gray-700"
                                )}>
                                    {req.person_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="font-semibold text-gray-900 text-sm">{req.person_name}</span>
                                        <span className="font-mono text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                            {req.person_nik}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                            req.status === 'PENDING' ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700"
                                        )}>
                                            {req.status === 'PENDING' ? 'Menunggu' : 'Disetujui'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-1">
                                        {req.additional_data_request}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {req.hospital_email} · {new Date(req.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {req.status === 'PENDING' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 gap-1.5 text-xs"
                                            onClick={() => handleStatusUpdate(req.request_id, 'REJECTED')}
                                            disabled={!!processing}
                                        >
                                            {processing === req.request_id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <X className="h-3.5 w-3.5" />
                                            }
                                            Tolak
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 rounded-lg bg-black hover:bg-gray-900 text-white gap-1.5 text-xs shadow-sm"
                                            onClick={() => handleStatusUpdate(req.request_id, 'APPROVED')}
                                            disabled={!!processing}
                                        >
                                            {processing === req.request_id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Check className="h-3.5 w-3.5" />
                                            }
                                            Setujui
                                        </Button>
                                    </>
                                )}
                                {req.status === 'APPROVED' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 gap-1.5 text-xs"
                                        onClick={() => {
                                            setSelectedRequest(req);
                                            setUploadOpen(true);
                                        }}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload Data
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="rounded-2xl border-gray-100 max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">Upload Dokumen</DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Upload file yang diminta untuk{" "}
                            <span className="font-semibold text-gray-700">{selectedRequest?.person_name}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-2 block">
                            File (PDF, Doc, Gambar - Max 10MB)
                        </Label>
                        <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-gray-300 transition-colors cursor-pointer bg-gray-50"
                            onClick={() => document.getElementById('upload-file')?.click()}
                        >
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-white" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{file.name}</p>
                                    <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-gray-300" />
                                    <p className="text-sm text-gray-500">Klik untuk memilih file</p>
                                    <p className="text-xs text-gray-400">PDF, DOC, JPG, PNG</p>
                                </div>
                            )}
                            <Input
                                id="upload-file"
                                type="file"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => { setUploadOpen(false); setFile(null); }}
                            className="rounded-xl border-gray-200 flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!file || !!processing}
                            className="rounded-xl bg-black hover:bg-gray-900 flex-1 gap-2"
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
