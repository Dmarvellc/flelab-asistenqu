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
            <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/10">
                No pending transfer requests.
            </div>
        );
    }

    return (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Requested At</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>From Agency</TableHead>
                        <TableHead>To Agency</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map((req) => (
                        <TableRow key={req.request_id}>
                            <TableCell className="whitespace-nowrap">
                                {format(new Date(req.requested_at), "d MMM yyyy HH:mm", { locale: id })}
                            </TableCell>
                            <TableCell className="font-medium">{req.agent_name}</TableCell>
                            <TableCell>{req.from_agency_name || "-"}</TableCell>
                            <TableCell>{req.to_agency_name}</TableCell>
                            <TableCell className="max-w-xs truncate" title={req.request_reason}>
                                {req.request_reason}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                    {req.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
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
