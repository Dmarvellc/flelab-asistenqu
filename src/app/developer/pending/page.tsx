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
};

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

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Pending Approvals</h2>
                <p className="text-muted-foreground">
                    Review and approve new user registrations.
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
                        ) : pending.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No pending approvals found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            pending.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>{user.full_name || "-"}</TableCell>
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
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>User Registration Details</DialogTitle>
                        <DialogDescription>
                            Review the user's submitted information before approving.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" size="lg" onClick={() => setIsDetailOpen(false)}>Close</Button>
                        <LiquidButton 
                            size="lg" 
                            onClick={handleApprove} 
                            disabled={actionLoading} 
                            className="ml-4"
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
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
