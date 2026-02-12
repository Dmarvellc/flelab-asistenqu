"use client";

import { useEffect, useState } from "react";


import { Loader2 } from "lucide-react";
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
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-8 text-neutral-500">
                <p>{error}</p>
            </div>
        );
    }

    if (!profile) return null;

    const formattedBirthDate = profile.birth_date
        ? format(new Date(profile.birth_date), "d MMMM yyyy", { locale: id })
        : "-";

    return (
        <div className="max-w-4xl space-y-12 pb-12">
            {/* Header Section */}
            <div className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
                <h2 className="text-2xl font-semibold tracking-tight">Pengaturan</h2>
                <p className="mt-1 text-sm text-neutral-500">
                    Kelola informasi akun dan data diri Anda di sini.
                </p>
            </div>



            {/* Personal Details Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                    <h3 className="text-lg font-medium">Informasi Pribadi</h3>
                </div>

                <div className="grid grid-cols-1 gap-y-8 gap-x-12 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Nama Lengkap
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {profile.full_name || "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Email
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {profile.email}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Nomor Telepon
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {profile.phone_number || "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            NIK
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 font-mono tracking-tight">
                            {profile.nik || "-"}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Tanggal Lahir
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {formattedBirthDate}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Jenis Kelamin
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {profile.gender === "MALE" ? "Laki-laki" :
                                profile.gender === "FEMALE" ? "Perempuan" :
                                    profile.gender || "-"}
                        </p>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Alamat
                        </label>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed max-w-2xl">
                            {profile.address || "-"}
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
}
