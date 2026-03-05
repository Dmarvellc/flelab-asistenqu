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
import { Loader2, Hospital, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PhoneInput } from "@/components/ui/phone-input";

export default function AddHospitalPage() {
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
                role: "hospital_admin",
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
                toast({ title: "Success", description: "Hospital Admin user created successfully!" });
                // Clear form
                setEmail("");
                setPassword("");
                setFullName("");
                setPhoneNumber("");
                setAddress("");
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to create Hospital Admin",
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
                        <Hospital className="h-8 w-8 text-primary" />
                        Add Hospital Account
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Create a new hospital admin account to manage healthcare services.
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
                    <CardTitle>Hospital Information</CardTitle>
                    <CardDescription>
                        Enter the details for the new hospital account. All fields marked with an asterisk are required.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Hospital Email <span className="text-red-500">*</span></Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@hospital.com"
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
                                        <Label htmlFor="fullName">Hospital / Administrator Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="fullName"
                                            placeholder="RSUP Dr. Sardjito"
                                            required
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phoneNumber">Phone Number</Label>
                                        <PhoneInput
                                            id="phoneNumber"
                                            placeholder="+62 812 3456 7890"
                                            value={phoneNumber}
                                            onChange={setPhoneNumber}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="address">Full Address</Label>
                                        <Input
                                            id="address"
                                            placeholder="Jl. Kesehatan No. 1, Yogyakarta"
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
                                "Create Hospital Account"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
