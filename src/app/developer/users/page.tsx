"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Search, Trash2, Edit, UserPlus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ActionModal } from "@/components/ui/action-modal";

type User = {
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [sortBy, setSortBy] = useState("created_at");
    const { toast } = useToast();

    // Edit User State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [editRole, setEditRole] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                search,
                sortBy,
                sortOrder,
            });
            const res = await fetch(`/api/users?${params}`);
            const data = await res.json();
            if (res.ok) {
                setUsers(data.data);
                setTotalPages(data.meta.totalPages);
            } else {
                toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to fetch users", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page, sortBy, sortOrder]);

    const handleDelete = async (userId: string) => {
        try {
            const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
            if (res.ok) {
                toast({ title: "Success", description: "User deleted successfully" });
                fetchUsers();
            } else {
                toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
        }
    };

    const handleEdit = (user: User) => {
        setCurrentUser(user);
        setEditRole(user.role);
        setEditStatus(user.status);
        setIsEditOpen(true);
    };

    const saveEdit = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`/api/users/${currentUser.user_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: editRole, status: editStatus }),
            });

            if (res.ok) {
                toast({ title: "Success", description: "User updated successfully" });
                setIsEditOpen(false);
                fetchUsers();
            } else {
                toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
        }
    };

    const toggleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                <p className="text-muted-foreground">
                    View, search, and manage all users in the system.
                </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
                        Refresh
                    </Button>
                    <AddUserDialog onUserAdded={fetchUsers} />
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead onClick={() => toggleSort("email")} className="cursor-pointer hover:bg-muted/50">
                                Email <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead onClick={() => toggleSort("role")} className="cursor-pointer hover:bg-muted/50">
                                Role <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead onClick={() => toggleSort("status")} className="cursor-pointer hover:bg-muted/50">
                                Status <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead onClick={() => toggleSort("created_at")} className="cursor-pointer hover:bg-muted/50">
                                Created At <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell className="font-medium">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.status === 'ACTIVE' ? 'default' : 'secondary'}
                                            className={user.status === 'ACTIVE' ? 'bg-green-500 hover:bg-green-600' : ''}
                                        >
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.user_id)}>
                                                    Copy User ID
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeleteTargetId(user.user_id)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                <div className="text-sm font-medium">
                    Page {page} of {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Make changes to the user's role and status here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input id="email" value={currentUser?.email || ''} disabled className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                Role
                            </Label>
                            <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="developer">Developer</SelectItem>
                                    <SelectItem value="admin_agency">Agency Admin</SelectItem>
                                    <SelectItem value="hospital">Hospital</SelectItem>
                                    <SelectItem value="insurance_admin">Insurance Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                Status
                            </Label>
                            <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={saveEdit}>Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ActionModal
                open={deleteTargetId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTargetId(null);
                }}
                title="Delete User"
                description="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Yes, Delete"
                cancelText="Cancel"
                destructive
                onConfirm={async () => {
                    if (!deleteTargetId) return;
                    await handleDelete(deleteTargetId);
                    setDeleteTargetId(null);
                }}
            />
        </div>
    );
}

function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Form States
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("agent");
    
    // Profile States
    const [fullName, setFullName] = useState("");
    const [nik, setNik] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [gender, setGender] = useState("MALE");

    const needsProfile = role === 'agent' || role === 'hospital_admin' || role === 'hospital';

    const cleanForm = () => {
        setEmail("");
        setPassword("");
        setRole("agent");
        setFullName("");
        setNik("");
        setPhoneNumber("");
        setAddress("");
        setBirthDate("");
        setGender("MALE");
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = {
                email,
                password,
                role: role === 'hospital' ? 'hospital_admin' : role, // Map 'hospital' to 'hospital_admin' for creation if needed, or keep 'hospital' if allowed
                fullName: needsProfile ? fullName : undefined,
                nik: needsProfile ? nik : undefined,
                phoneNumber: needsProfile ? phoneNumber : undefined,
                address: needsProfile ? address : undefined,
                birthDate: needsProfile ? birthDate : undefined,
                gender: needsProfile ? gender : undefined,
            };

            const res = await fetch("/api/developer/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                toast({ title: "Success", description: "User created successfully" });
                cleanForm();
                setOpen(false);
                onUserAdded();
            } else {
                toast({ 
                    title: "Error", 
                    description: data.error || "Failed to create user", 
                    variant: "destructive" 
                });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) cleanForm();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button className="bg-black text-white hover:bg-gray-800">
                    <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user. Form fields adjust based on the selected role.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    
                    {/* Role Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-role" className="text-right font-bold">Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="hospital_admin">Hospital Admin</SelectItem>
                                <SelectItem value="insurance_admin">Insurance Admin</SelectItem>
                                <SelectItem value="developer">Developer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border-t my-2"></div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-email" className="text-right">Email</Label>
                        <Input id="new-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-password" className="text-right">Password</Label>
                        <Input id="new-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="col-span-3" />
                    </div>

                    {/* Profile Fields for Agent/Hospital */}
                    {needsProfile && (
                        <>
                            <div className="border-t my-2"><span className="text-xs text-muted-foreground bg-white px-2 relative -top-5 left-4">Profile Details</span></div>
                            
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="fullname" className="text-right">Full Name</Label>
                                <Input id="fullname" required value={fullName} onChange={e => setFullName(e.target.value)} className="col-span-3" />
                            </div>
                            
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="phone" className="text-right">Phone</Label>
                                <Input id="phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="col-span-3" />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="address" className="text-right">Address</Label>
                                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} className="col-span-3" />
                            </div>

                            {/* Agent specific extra fields */}
                            {role === 'agent' && (
                                <>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="nik" className="text-right">NIK</Label>
                                        <Input id="nik" value={nik} onChange={e => setNik(e.target.value)} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="dob" className="text-right">Birth Date</Label>
                                        <Input id="dob" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="gender" className="text-right">Gender</Label>
                                        <Select value={gender} onValueChange={setGender}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MALE">Male</SelectItem>
                                                <SelectItem value="FEMALE">Female</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create User
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
