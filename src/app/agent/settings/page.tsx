"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Phone, MapPin, Calendar, User, CreditCard, Shield } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface UserProfile {
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    full_name: string;
    nik: string;
    phone_number: string;
    address: string;
    birth_date: string;
    gender: string;
}

export default function AgentSettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/agent/profile");
                if (!res.ok) {
                    throw new Error("Gagal mengambil data profil");
                }
                const data = await res.json();
                setProfile(data);
            } catch (err) {
                console.error(err);
                setError("Terjadi kesalahan saat memuat data profil.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-red-100 p-3 text-red-600">
                    <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Gagal memuat profil</h3>
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    if (!profile) return null;

    // Format dates if they exist
    const formattedBirthDate = profile.birth_date
        ? format(new Date(profile.birth_date), "d MMMM yyyy", { locale: id })
        : "-";

    const formattedJoinDate = profile.created_at
        ? format(new Date(profile.created_at), "d MMMM yyyy", { locale: id })
        : "-";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Pengaturan Akun</h2>
                <p className="text-muted-foreground">
                    Informasi profil dan data diri Anda.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Profile Card */}
                <Card className="md:col-span-1">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src="" alt={profile.full_name || "Agent"} />
                                <AvatarFallback className="text-2xl">
                                    {profile.full_name?.charAt(0).toUpperCase() || "A"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>{profile.full_name || "Agen Asuransi"}</CardTitle>
                        <CardDescription>{profile.email}</CardDescription>
                        <div className="mt-4 flex justify-center gap-2">
                            <Badge variant={profile.status === "ACTIVE" ? "default" : "secondary"}>
                                {profile.status === "ACTIVE" ? "Aktif" : profile.status}
                            </Badge>
                            <Badge variant="outline" className="uppercase">
                                {profile.role}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>Bergabung sejak {formattedJoinDate}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Info Card */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Data Diri</CardTitle>
                        <CardDescription>
                            Informasi lengkap mengenai identitas Anda.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{profile.full_name || "-"}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Email</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{profile.email}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Nomor Telepon</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{profile.phone_number || "-"}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Nomor Induk Kependudukan (NIK)</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{profile.nik || "-"}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Tanggal Lahir</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{formattedBirthDate}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Jenis Kelamin</label>
                                <div className="flex items-center gap-2 rounded-md border p-3">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                        {profile.gender === "MALE" ? "Laki-laki" :
                                            profile.gender === "FEMALE" ? "Perempuan" :
                                                profile.gender || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Alamat Lengkap</label>
                            <div className="flex items-start gap-2 rounded-md border p-3">
                                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                <span className="font-medium">{profile.address || "-"}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
