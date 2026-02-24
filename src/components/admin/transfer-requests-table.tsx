"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TransferRequest {
    request_id: string;
    agent_id: string;
    agent_name: string;
    from_agency_name?: string;
    to_agency_name: string;
    status: string;
    request_reason: string;
    requested_at: string;
}

export function TransferRequestsTable() {
    const [requests, setRequests] = useState<TransferRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/admin-agency/transfers");
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to fetch transfers",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (requestId: string, action: "APPROVE" | "REJECT") => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`/api/admin-agency/transfers/${requestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (!res.ok) {
                throw new Error("Action failed");
            }

            toast({
                title: "Success",
                description: `Request ${action === "APPROVE" ? "Approved" : "Rejected"}`,
                variant: "default",
            });

            // Refresh list
            fetchRequests();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to process request",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Tidak ada permintaan transfer yang menunggu keputusan.</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                        <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Waktu Permintaan</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Nama Agen</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Dari Agensi</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Ke Agensi</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Alasan</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Status</TableHead>
                        <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11 text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map((req) => (
                        <TableRow key={req.request_id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <TableCell className="px-6 whitespace-nowrap text-sm text-gray-600 font-medium">
                                {format(new Date(req.requested_at), "d MMM yyyy HH:mm", { locale: id })}
                            </TableCell>
                            <TableCell className="font-semibold text-sm text-gray-900">{req.agent_name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{req.from_agency_name || "-"}</TableCell>
                            <TableCell className="text-sm text-gray-600">{req.to_agency_name}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm text-gray-600" title={req.request_reason}>
                                {req.request_reason}
                            </TableCell>
                            <TableCell>
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                                    MENUNGGU
                                </span>
                            </TableCell>
                            <TableCell className="px-6 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleAction(req.request_id, "REJECT")}
                                        disabled={processingId === req.request_id}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleAction(req.request_id, "APPROVE")}
                                        disabled={processingId === req.request_id}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
