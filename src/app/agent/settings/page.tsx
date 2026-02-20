"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Edit2, Save, X, Camera, User, Mail, Phone, MapPin, Calendar, Shield, Building2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
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
    ktp_image_path: string | null;
    selfie_image_path: string | null;
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

export default function AgentSettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
    const [agencies, setAgencies] = useState<{ agency_id: string, name: string }[]>([]);
    const [showTransferForm, setShowTransferForm] = useState(false);
    const [transferForm, setTransferForm] = useState({ agencyId: "", reason: "" });
    const [transferLoading, setTransferLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<'personal' | 'agency'>('personal');

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

            setEditForm({
                fullName: data.full_name || "",
                phone: data.phone_number || "",
                nik: data.nik || "",
                address: data.address || "",
                birthDate: data.birth_date ? data.birth_date.split('T')[0] : "",
                gender: data.gender || "",
            });
        } catch (err: any) {
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
    };

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
                body: JSON.stringify({ targetAgencyId: transferForm.agencyId, reason: transferForm.reason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengajukan pindah agensi");

            toast({ title: "Berhasil", description: "Permintaan pindah agensi berhasil dikirim. Menunggu persetujuan admin." });
            setShowTransferForm(false);
            setTransferForm({ agencyId: "", reason: "" });
        } catch (e: any) {
            toast({ title: "Gagal", description: e.message, variant: "destructive" });
        } finally {
            setTransferLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                    <p className="text-sm text-gray-400">Memuat profil Anda...</p>
                </div>
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

    const formattedBirthDate = profile.birth_date
        ? format(new Date(profile.birth_date), "d MMMM yyyy", { locale: id })
        : null;

    const genderLabel = profile.gender === "MALE" || profile.gender === "LAKI-LAKI" ? "Laki-laki" :
        profile.gender === "FEMALE" || profile.gender === "PEREMPUAN" ? "Perempuan" :
            profile.gender || null;

    const getImagePath = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith("public/")) return "/" + path.substring(7);
        return path;
    };

    const ktpUrl = getImagePath(profile.ktp_image_path);
    const selfieUrl = getImagePath(profile.selfie_image_path);

    const initials = profile.full_name
        ? profile.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
        : profile.email[0].toUpperCase();

    const sections = [
        { key: 'personal', label: 'Profil', icon: User },
        { key: 'agency', label: 'Agensi', icon: Building2 },
    ] as const;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pengaturan</h1>
                <p className="mt-1 text-sm text-gray-500">Kelola informasi akun dan data diri Anda.</p>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar */}
                <div className="h-20 w-20 rounded-2xl bg-gray-900 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {initials}
                </div>

                <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">
                        {profile.full_name || "Nama belum diisi"}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{profile.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Bergabung {format(new Date(profile.created_at), "d MMMM yyyy", { locale: id })}
                    </p>
                </div>

                {!isEditing && (
                    <Button
                        onClick={() => { setIsEditing(true); setActiveSection('personal'); }}
                        variant="outline"
                        className="gap-2 rounded-xl shrink-0 border-gray-200 hover:border-gray-300"
                    >
                        <Edit2 className="h-4 w-4" />
                        Ubah Data
                    </Button>
                )}
            </div>

            {/* Section Tabs */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl w-fit">
                {sections.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            activeSection === key
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Section: Personal Info */}
            {activeSection === 'personal' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                        <div>
                            <h3 className="font-semibold text-gray-900">Informasi Pribadi</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Data identitas dan kontak Anda</p>
                        </div>
                        {isEditing && (
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleCancel}
                                    variant="ghost"
                                    size="sm"
                                    disabled={saving}
                                    className="gap-1.5 rounded-lg text-gray-500"
                                >
                                    <X className="h-4 w-4" />
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    size="sm"
                                    disabled={saving}
                                    className="gap-1.5 rounded-lg bg-black hover:bg-gray-900"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    Simpan
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="px-6 py-2">
                        <FieldRow
                            label="Email"
                            icon={Mail}
                            value={profile.email}
                            isEditing={false}
                        />
                        <FieldRow
                            label="Nama Lengkap"
                            icon={User}
                            value={profile.full_name}
                            isEditing={isEditing}
                            editElement={
                                <Input
                                    value={editForm.fullName}
                                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                                    placeholder="Nama lengkap"
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 max-w-sm"
                                />
                            }
                        />
                        <FieldRow
                            label="Nomor Telepon"
                            icon={Phone}
                            value={profile.phone_number}
                            isEditing={isEditing}
                            editElement={
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="+62..."
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 max-w-sm"
                                />
                            }
                        />
                        <FieldRow
                            label="NIK"
                            icon={Shield}
                            value={profile.nik}
                            mono
                            isEditing={isEditing}
                            editElement={
                                <Input
                                    value={editForm.nik}
                                    onChange={(e) => setEditForm({ ...editForm, nik: e.target.value })}
                                    placeholder="16 Digit NIK"
                                    className="rounded-xl border-gray-200 text-sm font-mono focus:border-gray-400 max-w-sm"
                                />
                            }
                        />
                        <FieldRow
                            label="Tanggal Lahir"
                            icon={Calendar}
                            value={formattedBirthDate}
                            isEditing={isEditing}
                            editElement={
                                <Input
                                    type="date"
                                    value={editForm.birthDate}
                                    onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 max-w-[200px]"
                                />
                            }
                        />
                        <FieldRow
                            label="Jenis Kelamin"
                            icon={User}
                            value={genderLabel}
                            isEditing={isEditing}
                            editElement={
                                <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                                    <SelectTrigger className="rounded-xl border-gray-200 text-sm max-w-[200px]">
                                        <SelectValue placeholder="Pilih..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
                                        <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                                    </SelectContent>
                                </Select>
                            }
                        />
                        <FieldRow
                            label="Alamat"
                            icon={MapPin}
                            value={profile.address}
                            isEditing={isEditing}
                            editElement={
                                <Textarea
                                    value={editForm.address}
                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                    placeholder="Alamat lengkap"
                                    className="rounded-xl border-gray-200 text-sm focus:border-gray-400 min-h-[80px] max-w-sm"
                                />
                            }
                        />
                    </div>
                </div>
            )}

            {/* Section: Agency */}
            {activeSection === 'agency' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                        <h3 className="font-semibold text-gray-900">Pengaturan Agensi</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Informasi agensi tempat Anda bernaung</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-12 w-12 rounded-xl bg-gray-900 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Agensi Saat Ini</p>
                                <p className="font-semibold text-gray-900 text-lg">
                                    {profile.agency_name || "Belum ada agensi"}
                                </p>
                                {profile.agency_address && (
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {profile.agency_address}
                                    </p>
                                )}
                                {!profile.agency_id && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Ajukan permintaan pindah agensi untuk bergabung dengan agensi.
                                    </p>
                                )}
                            </div>
                        </div>

                        {!showTransferForm ? (
                            <Button
                                variant="outline"
                                onClick={() => setShowTransferForm(true)}
                                className="gap-2 rounded-xl border-gray-200 hover:border-gray-300"
                            >
                                <ArrowRight className="h-4 w-4" />
                                Pindah Agensi
                            </Button>
                        ) : (
                            <div className="border border-gray-100 rounded-2xl p-5 space-y-4 bg-gray-50/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-gray-900">Formulir Pindah Agensi</h4>
                                    <button
                                        onClick={() => setShowTransferForm(false)}
                                        className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Agensi Tujuan
                                    </Label>
                                    <Select
                                        value={transferForm.agencyId}
                                        onValueChange={(val) => setTransferForm({ ...transferForm, agencyId: val })}
                                    >
                                        <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                                            <SelectValue placeholder="Pilih agensi tujuan..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {agencies.filter(a => a.agency_id !== profile.agency_id).map(agency => (
                                                <SelectItem key={agency.agency_id} value={agency.agency_id}>
                                                    {agency.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Alasan Pindah
                                    </Label>
                                    <Textarea
                                        placeholder="Jelaskan alasan Anda pindah..."
                                        value={transferForm.reason}
                                        onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                                        className="rounded-xl border-gray-200 bg-white resize-none min-h-[80px]"
                                    />
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowTransferForm(false)}
                                        className="rounded-xl text-gray-500"
                                        disabled={transferLoading}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleTransferSubmit}
                                        disabled={transferLoading || !transferForm.agencyId}
                                        className="gap-2 rounded-xl bg-black hover:bg-gray-900"
                                    >
                                        {transferLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Ajukan Pindah
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
