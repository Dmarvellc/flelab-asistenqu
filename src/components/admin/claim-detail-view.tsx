"use client";

import { Claim } from "@/lib/claims-data";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ClaimDetailViewProps {
    claim: Claim & { agent_notes?: string; hospital_notes?: string; admin_review_notes?: string };
}

export function ClaimDetailView({ claim }: ClaimDetailViewProps) {
    const router = useRouter();
    const [notes, setNotes] = useState("");
    const [processing, setProcessing] = useState(false);

    const handleAction = async (action: "APPROVE" | "REJECT") => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/claims/${claim.claim_id}/workflow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, notes }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Action failed");
            }

            toast({
                title: "Success",
                description: `Claim ${action === "APPROVE" ? "Approved" : "Rejected"}`,
                variant: "default",
            });

            router.refresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'REJECTED': return 'bg-red-100 text-red-800 border-red-200';
            case 'REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Claim Details: {claim.claim_id}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={getStatusColor(claim.status)}>{claim.status}</Badge>
                        <Badge variant="outline" className="border-neutral-400 text-neutral-600">{claim.stage || "No Stage"}</Badge>
                    </div>
                </div>

                {claim.status === 'REVIEW' && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="destructive"
                            onClick={() => handleAction("REJECT")}
                            disabled={processing}
                            className="flex-1 md:flex-none"
                        >
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Reject
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
                            onClick={() => handleAction("APPROVE")}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Approve
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Claim Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Client Name:</span>
                            <span className="font-medium text-right">{claim.client_name}</span>

                            <span className="text-muted-foreground">Policy Number:</span>
                            <span className="font-medium text-right">{claim.policy_number}</span>

                            <span className="text-muted-foreground">Claim Date:</span>
                            <span className="font-medium text-right">{claim.claim_date ? format(new Date(claim.claim_date), "d MMM yyyy", { locale: id }) : "-"}</span>

                            <span className="text-muted-foreground">Hospital:</span>
                            <span className="font-medium text-right">{claim.hospital_name}</span>

                            <span className="text-muted-foreground">Disease/Condition:</span>
                            <span className="font-medium text-right">{claim.disease_name || "-"}</span>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total Amount:</span>
                            <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(claim.total_amount)}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Process Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {claim.agent_notes && (
                                <div className="bg-blue-50/50 p-3 rounded-md text-sm border border-blue-100">
                                    <span className="font-semibold text-blue-700 block mb-1">Agent Notes:</span>
                                    <p className="whitespace-pre-line text-neutral-700">{claim.agent_notes}</p>
                                </div>
                            )}

                            {claim.hospital_notes && (
                                <div className="bg-green-50/50 p-3 rounded-md text-sm border border-green-100">
                                    <span className="font-semibold text-green-700 block mb-1">Hospital Notes:</span>
                                    <p className="whitespace-pre-line text-neutral-700">{claim.hospital_notes}</p>
                                </div>
                            )}

                            {claim.admin_review_notes && (
                                <div className="bg-slate-50/50 p-3 rounded-md text-sm border border-slate-100">
                                    <span className="font-semibold text-slate-700 block mb-1">Admin Decision:</span>
                                    <p className="whitespace-pre-line text-neutral-700">{claim.admin_review_notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {claim.status === 'REVIEW' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Review Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    placeholder="Add notes for approval or rejection reason..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
