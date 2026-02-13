"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, UserCheck, Eye, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PendingUser = {
    user_id: string;
    email: string;
    role: string;
    created_at: string;
    full_name?: string;
    nik?: string;
    phone_number?: string;
    address?: string;
    birth_date?: string;
    gender?: string;
    ktp_image_path?: string;
    selfie_image_path?: string;
};

// Helper for image path
const getImagePath = (path: string | undefined) => {
    if (!path) return null;
    if (path.startsWith("public/")) return "/" + path.substring(7);
    return path;
};

import Image from "next/image";

export default function PendingApprovalsPage() {
    const [pending, setPending] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/developer/pending");
            const data = await res.json();
            if (res.ok) {
                setPending(data.pending || []);
            } else {
                toast({ title: "Error", description: "Failed to load pending users", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load pending users", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/developer/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.user_id }),
            });

            if (res.ok) {
                toast({ title: "Success", description: "User approved successfully" });
                setIsDetailOpen(false);
                fetchPending();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to approve user", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to approve user", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewDetail = (user: PendingUser) => {
        setSelectedUser(user);
        setIsDetailOpen(true);
    };

    const [declineLoading, setDeclineLoading] = useState(false);

    // Filter users who have uploaded documents
    const filteredPending = pending.filter(user => user.ktp_image_path && user.selfie_image_path);

    const handleDecline = async () => {
        if (!selectedUser) return;
        if (!confirm("Are you sure you want to decline this user? This action cannot be undone.")) return;

        setDeclineLoading(true);
        try {
            const res = await fetch("/api/developer/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUser.user_id }),
            });

            if (res.ok) {
                toast({ title: "User Declined", description: "User has been rejected." });
                setIsDetailOpen(false);
                fetchPending();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to decline user", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to decline user", variant: "destructive" });
        } finally {
            setDeclineLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Pending Approvals</h2>
                <p className="text-muted-foreground">
                    Review and approve new user registrations. Only users with uploaded documents are shown.
                </p>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Submitted At</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredPending.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No pending approvals with documents found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPending.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {user.full_name || "-"}
                                            {user.ktp_image_path && user.selfie_image_path && (
                                                <div title="Documents Uploaded" className="bg-emerald-100 text-emerald-600 rounded-full p-1 w-6 h-6 flex items-center justify-center">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewDetail(user)}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Detail
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>User Registration Details</DialogTitle>
                        <DialogDescription>
                            Review the user's submitted information before approving.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 pt-2">
                        {selectedUser && (
                            <div className="grid gap-6">
                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Email</span>
                                        <p className="text-sm font-semibold">{selectedUser.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Role</span>
                                        <p className="text-sm font-semibold capitalize">{selectedUser.role}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                                        <p className="text-sm font-semibold">{selectedUser.full_name || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">NIK</span>
                                        <p className="text-sm font-semibold">{selectedUser.nik || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                                        <p className="text-sm font-semibold">{selectedUser.phone_number || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Gender</span>
                                        <p className="text-sm font-semibold">{selectedUser.gender || "-"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Birth Date</span>
                                        <p className="text-sm font-semibold">{selectedUser.birth_date || "-"}</p>
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <span className="text-sm font-medium text-muted-foreground">Address</span>
                                        <p className="text-sm font-semibold">{selectedUser.address || "-"}</p>
                                    </div>
                                </div>

                                {/* Verification Documents */}
                                {(selectedUser.ktp_image_path || selectedUser.selfie_image_path) && (
                                    <div className="space-y-4">
                                        <h4 className="font-medium">Verification Documents</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedUser.ktp_image_path && (
                                                <div className="space-y-2">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase">KTP Photo</span>
                                                    <div className="border rounded-md overflow-hidden bg-muted/20 aspect-video relative group">
                                                        <Image
                                                            src={getImagePath(selectedUser.ktp_image_path)!}
                                                            alt="KTP"
                                                            fill
                                                            className="object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(getImagePath(selectedUser.ktp_image_path)!, '_blank')}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to View</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedUser.selfie_image_path && (
                                                <div className="space-y-2">
                                                    <span className="text-xs font-medium text-muted-foreground uppercase">Selfie with KTP</span>
                                                    <div className="border rounded-md overflow-hidden bg-muted/20 aspect-video relative group">
                                                        <Image
                                                            src={getImagePath(selectedUser.selfie_image_path)!}
                                                            alt="Selfie"
                                                            fill
                                                            className="object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => window.open(getImagePath(selectedUser.selfie_image_path)!, '_blank')}
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">Click to View</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Custom Footer replacement for better layout control */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-4 p-6 pt-4 border-t bg-background sticky bottom-0 z-10">
                        <Button
                            variant="destructive"
                            onClick={handleDecline}
                            disabled={declineLoading || actionLoading}
                            className="w-full sm:w-auto"
                        >
                            {declineLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Declining...
                                </>
                            ) : "Decline User"}
                        </Button>

                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
                            <LiquidButton
                                onClick={handleApprove}
                                disabled={actionLoading || declineLoading}
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Approving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Approve User
                                    </>
                                )}
                            </LiquidButton>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
