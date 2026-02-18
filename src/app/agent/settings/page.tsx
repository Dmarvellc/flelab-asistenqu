"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

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
    birth_date: string | null; // ISO Date string
    gender: string | null;
    ktp_image_path: string | null;
    selfie_image_path: string | null;
    agency_id?: string;
    agency_name?: string;
}

export default function AgentSettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: "",
        phone: "",
        nik: "",
        address: "",
        birthDate: "",
        gender: "",
    });
    const [saving, setSaving] = useState(false);

    // Agency Transfer State
    const [agencies, setAgencies] = useState<{ agency_id: string, name: string }[]>([]);
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [transferForm, setTransferForm] = useState({ agencyId: "", reason: "" });
    const [transferLoading, setTransferLoading] = useState(false);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/agent/profile");

            if (res.status === 401) {
                localStorage.removeItem("user");
                router.push("/agent/login");
                return;
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal mengambil data profil");
            }

            const data = await res.json();
            setProfile(data);

            // Initialize form with fetched data
            setEditForm({
                fullName: data.full_name || "",
                phone: data.phone_number || "",
                nik: data.nik || "",
                address: data.address || "",
                birthDate: data.birth_date ? data.birth_date.split('T')[0] : "",
                gender: data.gender || "",
            });

        } catch (err: any) {
            console.error("Profile fetch error:", err);
            setError(err.message || "Terjadi kesalahan saat memuat data profil.");
        } finally {
            setLoading(false);
        }
    };

    const fetchAgencies = async () => {
        try {
            const res = await fetch("/api/public/agencies");
            if (res.ok) {
                const data = await res.json();
                setAgencies(data);
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        fetchProfile();
        fetchAgencies();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/agent/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: editForm.fullName,
                    phone: editForm.phone,
                    nik: editForm.nik,
                    address: editForm.address,
                    birthDate: editForm.birthDate,
                    gender: editForm.gender,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan perubahan");
            }

            toast({
                title: "Berhasil",
                description: "Profil berhasil diperbarui.",
                variant: "default",
            });

            // Refresh data
            await fetchProfile();
            setIsEditing(false);
        } catch (err: any) {
            console.error("Save error:", err);
            setError(err.message || "Gagal menyimpan perubahan.");
            toast({
                title: "Gagal",
                description: err.message || "Gagal menyimpan perubahan.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (profile) {
            setEditForm({
                fullName: profile.full_name || "",
                phone: profile.phone_number || "",
                nik: profile.nik || "",
                address: profile.address || "",
                birthDate: profile.birth_date ? profile.birth_date.split('T')[0] : "",
                gender: profile.gender || "",
            });
        }
    };

    const handleTransferSubmit = async () => {
        if (!transferForm.agencyId) return;
        setTransferLoading(true);
        try {
            const res = await fetch("/api/agent/transfer-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetAgencyId: transferForm.agencyId,
                    reason: transferForm.reason
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengajukan pindah agensi");

            toast({
                title: "Berhasil",
                description: "Permintaan pindah agensi berhasil dikirim. Menunggu persetujuan admin.",
                variant: "default"
            });
            setShowTransferForm(false);
            setTransferForm({ agencyId: "", reason: "" });
        } catch (e: any) {
            toast({
                title: "Gagal",
                description: e.message,
                variant: "destructive"
            });
        } finally {
            setTransferLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && !profile) {
        return (
            <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Gagal memuat profil</h3>
                    <p className="text-sm text-neutral-500">{error}</p>
                </div>
                <Button onClick={fetchProfile} variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Coba Lagi
                </Button>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center text-neutral-500">
                Data profil tidak ditemukan.
            </div>
        );
    }

    const formattedBirthDate = profile.birth_date
        ? format(new Date(profile.birth_date), "d MMMM yyyy", { locale: id })
        : "-";

    const genderLabel = profile.gender === "MALE" || profile.gender === "LAKI-LAKI" ? "Laki-laki" :
        profile.gender === "FEMALE" || profile.gender === "PEREMPUAN" ? "Perempuan" :
            profile.gender || "-";

    // Helper to format path
    const getImagePath = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith("public/")) return "/" + path.substring(7);
        return path;
    };

    const ktpUrl = getImagePath(profile.ktp_image_path);
    const selfieUrl = getImagePath(profile.selfie_image_path);

    return (
        <div className="max-w-4xl space-y-8 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-5 dark:border-neutral-800">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Pengaturan</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                        Kelola informasi akun dan data diri Anda.
                    </p>
                </div>
                {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Ubah Data
                    </Button>
                )}
            </div>

            {/* Main Form */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                    <h3 className="text-lg font-medium">Informasi Pribadi</h3>
                    {isEditing && (
                        <div className="flex gap-2">
                            <Button onClick={handleCancel} variant="ghost" size="sm" disabled={saving}>
                                <X className="h-4 w-4 mr-1" /> Batal
                            </Button>
                            <Button onClick={handleSave} size="sm" disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                                Simpan
                            </Button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-y-6 gap-x-12 md:grid-cols-2">

                    {/* Email (Read Only) */}
                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">Email (Tidak dapat diubah)</Label>
                        <Input value={profile.email} disabled className="bg-muted" />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Nama Lengkap
                        </Label>
                        {isEditing ? (
                            <Input
                                id="fullName"
                                value={editForm.fullName}
                                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                placeholder="Masukan nama lengkap"
                            />
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {profile.full_name || <span className="text-neutral-400 italic">Belum diisi</span>}
                            </p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Nomor Telepon
                        </Label>
                        {isEditing ? (
                            <Input
                                id="phone"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="+62..."
                            />
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {profile.phone_number || <span className="text-neutral-400 italic">Belum diisi</span>}
                            </p>
                        )}
                    </div>

                    {/* NIK */}
                    <div className="space-y-2">
                        <Label htmlFor="nik" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            NIK
                        </Label>
                        {isEditing ? (
                            <Input
                                id="nik"
                                value={editForm.nik}
                                onChange={(e) => setEditForm({ ...editForm, nik: e.target.value })}
                                placeholder="16 Digit NIK"
                            />
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 font-mono tracking-tight min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {profile.nik || <span className="text-neutral-400 italic">Belum diisi</span>}
                            </p>
                        )}
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-2">
                        <Label htmlFor="birthDate" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Tanggal Lahir
                        </Label>
                        {isEditing ? (
                            <Input
                                id="birthDate"
                                type="date"
                                value={editForm.birthDate}
                                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                            />
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {formattedBirthDate}
                            </p>
                        )}
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Jenis Kelamin
                        </Label>
                        {isEditing ? (
                            <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Jenis Kelamin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {genderLabel}
                            </p>
                        )}
                    </div>

                    {/* Address */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label htmlFor="address" className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Alamat
                        </Label>
                        {isEditing ? (
                            <Textarea
                                id="address"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder="Alamat lengkap"
                                className="min-h-[80px]"
                            />
                        ) : (
                            <p className="font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed max-w-2xl min-h-[40px] flex items-center border-b border-dashed border-neutral-200 dark:border-neutral-800">
                                {profile.address || <span className="text-neutral-400 italic">Belum diisi</span>}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Verification Documents Section (Always Read Only) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                    <h3 className="text-lg font-medium">Dokumen Verifikasi</h3>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* KTP Image */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Foto KTP
                        </Label>
                        <div className="border rounded-lg overflow-hidden bg-muted/20 aspect-video relative flex items-center justify-center">
                            {ktpUrl ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={ktpUrl}
                                        alt="Foto KTP"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                        onClick={() => window.open(ktpUrl, '_blank')}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-400 italic">Belum diupload</p>
                            )}
                        </div>
                    </div>

                    {/* Selfie Image */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Foto Selfie dengan KTP
                        </Label>
                        <div className="border rounded-lg overflow-hidden bg-muted/20 aspect-video relative flex items-center justify-center">
                            {selfieUrl ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={selfieUrl}
                                        alt="Foto Selfie"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                                        onClick={() => window.open(selfieUrl, '_blank')}
                                    />
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-400 italic">Belum diupload</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Agency Settings */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
                    <h3 className="text-lg font-medium">Pengaturan Agensi</h3>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">Agensi Saat Ini</Label>
                        <p className="font-medium text-lg">{profile.agency_name || "Belum ada agensi"}</p>
                    </div>
                </div>

                {!showTransferForm ? (
                    <Button variant="outline" onClick={() => setShowTransferForm(true)}>
                        Pindah Agensi
                    </Button>
                ) : (
                    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <h4 className="font-medium">Formulir Pindah Agensi</h4>
                        <div className="space-y-2">
                            <Label>Pilih Agensi Tujuan</Label>
                            <Select
                                value={transferForm.agencyId}
                                onValueChange={(val) => setTransferForm({ ...transferForm, agencyId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih agensi..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {agencies.filter(a => a.agency_id !== profile.agency_id).map(agency => (
                                        <SelectItem key={agency.agency_id} value={agency.agency_id}>
                                            {agency.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Alasan Pindah</Label>
                            <Textarea
                                placeholder="Jelaskan alasan Anda pindah..."
                                value={transferForm.reason}
                                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setShowTransferForm(false)}>Batal</Button>
                            <Button onClick={handleTransferSubmit} disabled={transferLoading}>
                                {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Ajukan Pindah
                            </Button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
