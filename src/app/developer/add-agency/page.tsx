"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AddAgencyPage() {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body = {
                email,
                password,
                role: "admin_agency",
                fullName,
                phoneNumber,
                address,
            };

            const res = await fetch("/api/developer/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                toast({ title: "Success", description: "Admin Agency user created successfully!" });
                // Clear form
                setEmail("");
                setPassword("");
                setFullName("");
                setPhoneNumber("");
                setAddress("");
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to create Admin Agency",
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
        <div className="space-y-6 max-w-2xl mx-auto py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Briefcase className="h-8 w-8 text-primary" />
                        Add Agency Account
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Create a new administrative account for an insurance agency.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/developer/users">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Users
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Agency Information</CardTitle>
                    <CardDescription>
                        Enter the details for the new Admin Agency account. All fields marked with an asterisk are required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Admin Email <span className="text-red-500">*</span></Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@agency.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="border-t my-4 py-4">
                                <h3 className="text-lg font-medium mb-4">Profile Details</h3>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="fullName">Agency Name / Administrator <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="fullName"
                                            placeholder="Alpha Insurance Agency"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phoneNumber">Phone Number</Label>
                                        <Input
                                            id="phoneNumber"
                                            placeholder="+62 811 2233 4455"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="address">Full Address</Label>
                                        <Input
                                            id="address"
                                            placeholder="Jl. Sudirman Kav. 21, Jakarta Pusat"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Agency Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
