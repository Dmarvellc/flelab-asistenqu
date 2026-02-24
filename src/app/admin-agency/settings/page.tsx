"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Edit2, Save, X, User, Mail, Phone, MapPin, Calendar, Shield, Building2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UserProfile {
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    full_name: string | null;
    nik: string | null;
    phone_number: string | null;
    address: string | null;
    birth_date: string | null;
    gender: string | null;
    agency_id?: string | null;
    agency_name?: string | null;
    agency_address?: string | null;
}

function FieldRow({
    label,
    icon: Icon,
    value,
    isEditing,
    editElement,
    mono = false,
}: {
    label: string;
    icon: React.ElementType;
    value: React.ReactNode;
    isEditing: boolean;
    editElement?: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 sm:w-48 shrink-0">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
            </div>
            <div className="flex-1 min-w-0">
                {isEditing && editElement ? (
                    editElement
                ) : (
                    <p className={cn(
                        "text-sm text-gray-900",
                        mono && "font-mono tracking-wide",
                        !value && "text-gray-400 italic"
                    )}>
                        {value || "Belum diisi"}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AdminAgencySettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [editForm, setEditForm] = useState({
        agency_name: "",
        agency_address: "",
    });

    const [saving, setSaving] = useState(false);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/admin-agency/profile");

            if (res.status === 401) {
                router.push("/admin-agency/login");
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal mengambil data profil");
            }

            const data = await res.json();
            setProfile(data);

            setEditForm({
                agency_name: data.agency_name || "",
                agency_address: data.agency_address || "",
            });
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat data profil.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/admin-agency/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan perubahan");
            }

            toast({ title: "Berhasil", description: "Profil berhasil diperbarui." });
            await fetchProfile();
            setIsEditing(false);
        } catch (err: any) {
            toast({ title: "Gagal", description: err.message || "Gagal menyimpan perubahan.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (profile) {
            setEditForm({
                agency_name: profile.agency_name || "",
                agency_address: profile.agency_address || "",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-1 w-full items-center justify-center p-12">
                <Loader2 className="h-8 w-8 rounded-full animate-spin text-gray-500" />
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-center">
                    <p className="font-semibold text-gray-800">Gagal memuat profil</p>
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                </div>
                <Button onClick={fetchProfile} variant="outline" className="gap-2 rounded-xl">
                    <RefreshCw className="h-4 w-4" />
                    Coba Lagi
                </Button>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center text-gray-400 text-sm">
                Data profil tidak ditemukan.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 animate-in fade-in duration-500 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                    <p className="text-[15px] font-semibold text-gray-500 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Pengaturan Agensi
                    </p>
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mt-2">Profil Perusahaan</h1>
                    <p className="mt-1 text-base text-gray-500">Kelola informasi operasional dan identitas agensi asuransi Anda secara profesional.</p>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:shadow-lg transition-all duration-300">
                <div className="h-24 w-24 rounded-3xl bg-gray-900 flex items-center justify-center text-white shrink-0 shadow-inner">
                    <Building2 className="h-10 w-10 text-white" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {profile.agency_name || "Agensi Belum Dikonfigurasi"}
                    </h2>
                    <p className="text-base font-medium text-gray-500 flex items-center gap-2 w-fit bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {profile.agency_address || "Alamat belum diatur"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[12px] font-semibold tracking-wide text-gray-400 uppercase flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            Administrator: {profile.full_name || profile.email}
                        </p>
                    </div>
                </div>

                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-gray-50 hover:bg-white text-gray-900 text-[15px] font-semibold h-12 px-6 rounded-2xl transition-all shadow-sm border border-gray-200 flex items-center gap-2 mt-4 sm:mt-0 hover:shadow-md"
                    >
                        <Edit2 className="h-4 w-4" />
                        Kelola Profil Agensi
                    </button>
                )}
            </div>

            {/* Sections Container */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative">

                {/* Fixed Action Bar during Edit Mode */}
                {isEditing && (
                    <div className="w-full bg-gray-900 text-white z-10 border-b border-gray-800 p-4 flex items-center justify-between shadow-sm top-0 sticky">
                        <div className="flex items-center gap-3 ml-4">
                            <AlertCircle className="h-5 w-5 text-gray-300" />
                            <p className="text-sm font-medium text-white">Anda sedang mengubah data publik agensi.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 text-[14px] font-semibold h-10 px-4 rounded-xl transition-all flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-white hover:bg-gray-100 text-black text-[14px] font-semibold h-10 px-6 rounded-xl transition-all shadow-md flex items-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Simpan Data
                            </button>
                        </div>
                    </div>
                )}

                <div className="animate-in fade-in duration-300 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-gray-50 bg-gray-50/30 gap-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-gray-900">Detail Perusahaan</h3>
                            <p className="text-[14px] font-medium text-gray-500">Informasi resmi agensi yang akan ditampilkan pada sistem dan agen-agen asuransi</p>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <FieldRow
                            label="Nama Agensi Resmi"
                            icon={Building2}
                            value={profile.agency_name}
                            isEditing={isEditing}
                            editElement={
                                <Input
                                    value={editForm.agency_name}
                                    onChange={(e) => setEditForm({ ...editForm, agency_name: e.target.value })}
                                    placeholder="Contoh: PT. Asuransi Hebat Bersama"
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 max-w-sm font-semibold"
                                />
                            }
                        />
                        <FieldRow
                            label="Alamat Operasional Utama"
                            icon={MapPin}
                            value={profile.agency_address}
                            isEditing={isEditing}
                            editElement={
                                <Textarea
                                    value={editForm.agency_address}
                                    onChange={(e) => setEditForm({ ...editForm, agency_address: e.target.value })}
                                    placeholder="Alamat lengkap gedung, nomor jalan, kota..."
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 min-h-[100px] max-w-lg"
                                />
                            }
                        />

                        {!profile.agency_id && !isEditing && (
                            <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4">
                                <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-900">Akun Belum Tertaut Sistem Agensi</h4>
                                    <p className="text-sm text-red-700 mt-1">Harap hubungi Developer untuk menghubungkan akun admin ini dengan database agensi yang valid.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
