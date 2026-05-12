"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Edit2, Save, X, User, Mail, Phone, MapPin, Calendar, Shield, Building2, UploadCloud, FileText, Palette, Link2, Eye, RotateCcw } from "lucide-react";
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
    claim_form_url?: string | null;
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
                <span className="text-xs font-medium text-gray-400">{label}</span>
            </div>
            <div className="flex-1 min-w-0">
                {isEditing && editElement ? (
                    editElement
                ) : (
                    <p className={cn(
                        "text-sm text-black",
                        mono && "tracking-wide",
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
    const [uploadingTemplate, setUploadingTemplate] = useState(false);

    // Branding state
    const [branding, setBranding] = useState({
        slug: "",
        logoUrl: "",
        primaryColor: "#111827",
        secondaryColor: "#374151",
        accentColor: "#3B82F6",
        sidebarBg: "#FFFFFF",
        sidebarText: "#111827",
        loginBg: "#F9FAFB",
    });
    const [brandingLoading, setBrandingLoading] = useState(true);
    const [brandingSaving, setBrandingSaving] = useState(false);
    const [showBrandingEdit, setShowBrandingEdit] = useState(false);
    const [editDraftRestored, setEditDraftRestored] = useState(false);
    const [brandingDraftRestored, setBrandingDraftRestored] = useState(false);

    const AGENCY_SETTINGS_DRAFT_KEY = "admin_agency_settings_draft_v1";
    const AGENCY_BRANDING_DRAFT_KEY = "admin_agency_branding_draft_v1";

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

    const fetchBranding = async () => {
        try {
            setBrandingLoading(true);
            const res = await fetch("/api/admin-agency/branding");
            if (res.ok) {
                const data = await res.json();
                setBranding({
                    slug: data.slug || "",
                    logoUrl: data.logoUrl || "",
                    primaryColor: data.primaryColor || "#111827",
                    secondaryColor: data.secondaryColor || "#374151",
                    accentColor: data.accentColor || "#3B82F6",
                    sidebarBg: data.sidebarBg || "#FFFFFF",
                    sidebarText: data.sidebarText || "#111827",
                    loginBg: data.loginBg || "#F9FAFB",
                });
            }
        } catch { /* ignore */ }
        finally { setBrandingLoading(false); }
    };

    const handleBrandingSave = async () => {
        setBrandingSaving(true);
        try {
            const res = await fetch("/api/admin-agency/branding", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(branding),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyimpan branding");
            }
            localStorage.removeItem(AGENCY_BRANDING_DRAFT_KEY);
            toast({ title: "Berhasil", description: "Branding berhasil diperbarui." });
            setShowBrandingEdit(false);
            setBrandingDraftRestored(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Gagal menyimpan.";
            toast({ title: "Gagal", description: msg, variant: "destructive" });
        } finally {
            setBrandingSaving(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchBranding();
    }, []);

    // Auto-save editForm while in edit mode
    useEffect(() => {
        if (!isEditing) return;
        try { localStorage.setItem(AGENCY_SETTINGS_DRAFT_KEY, JSON.stringify(editForm)); } catch { /* ignore */ }
    }, [editForm, isEditing]);

    // Auto-save branding while in branding edit mode
    useEffect(() => {
        if (!showBrandingEdit) return;
        try { localStorage.setItem(AGENCY_BRANDING_DRAFT_KEY, JSON.stringify(branding)); } catch { /* ignore */ }
    }, [branding, showBrandingEdit]);

    const handleStartEdit = () => {
        setIsEditing(true);
        try {
            const saved = localStorage.getItem(AGENCY_SETTINGS_DRAFT_KEY);
            if (saved) { setEditForm(prev => ({ ...prev, ...JSON.parse(saved) })); setEditDraftRestored(true); }
        } catch { /* ignore */ }
    };

    const handleStartBrandingEdit = () => {
        setShowBrandingEdit(true);
        try {
            const saved = localStorage.getItem(AGENCY_BRANDING_DRAFT_KEY);
            if (saved) { setBranding(prev => ({ ...prev, ...JSON.parse(saved) })); setBrandingDraftRestored(true); }
        } catch { /* ignore */ }
    };

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

            localStorage.removeItem(AGENCY_SETTINGS_DRAFT_KEY);
            toast({ title: "Berhasil", description: "Profil berhasil diperbarui." });
            await fetchProfile();
            setIsEditing(false);
            setEditDraftRestored(false);
        } catch (err: any) {
            toast({ title: "Gagal", description: err.message || "Gagal menyimpan perubahan.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleUploadTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingTemplate(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin-agency/template", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Gagal mengunggah template");
            }

            const data = await res.json();
            setProfile(prev => prev ? { ...prev, claim_form_url: data.url } : null);
            toast({ title: "Berhasil", description: "Template form klaim berhasil diunggah." });
        } catch (err: any) {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        } finally {
            setUploadingTemplate(false);
            // reset file input
            e.target.value = '';
        }
    };

    const handleCancel = () => {
        localStorage.removeItem(AGENCY_SETTINGS_DRAFT_KEY);
        setIsEditing(false);
        setEditDraftRestored(false);
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
                <div className="h-14 w-14 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="text-center">
                    <p className="font-semibold text-gray-800">Gagal memuat profil</p>
                    <p className="text-sm text-gray-500 mt-1">{error}</p>
                </div>
                <Button onClick={fetchProfile} variant="outline" className="gap-2 rounded-md">
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
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Building2 className="h-3.5 w-3.5" />
                        Pengaturan Agensi
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">Profil Perusahaan</h1>
                    <p className="mt-1.5 text-sm text-gray-500">Kelola informasi operasional dan identitas agensi asuransi Anda secara profesional.</p>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:shadow-lg transition-all duration-300">
                <div className="h-24 w-24 rounded-lg bg-black flex items-center justify-center text-white shrink-0 shadow-inner">
                    <Building2 className="h-10 w-10 text-white" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-black">
                        {profile.agency_name || "Agensi Belum Dikonfigurasi"}
                    </h2>
                    <p className="text-base font-medium text-gray-500 flex items-center gap-2 w-fit bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
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
                        onClick={handleStartEdit}
                        className="bg-gray-50 hover:bg-white text-black text-[15px] font-semibold h-12 px-6 rounded-md transition-all shadow-sm border border-gray-200 flex items-center gap-2 mt-4 sm:mt-0 hover:shadow-md"
                    >
                        <Edit2 className="h-4 w-4" />
                        Kelola Profil Agensi
                    </button>
                )}
            </div>

            {/* Sections Container */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">

                {/* Fixed Action Bar during Edit Mode */}
                {isEditing && (
                    <div className="w-full bg-black text-white z-10 border-b border-gray-800 p-4 flex items-center justify-between shadow-sm top-0 sticky">
                        <div className="flex items-center gap-3 ml-4">
                            <AlertCircle className="h-5 w-5 text-gray-300" />
                            <p className="text-sm font-medium text-white">Anda sedang mengubah data publik agensi.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="bg-transparent border border-gray-700 text-gray-300 hover:bg-gray-800 text-[14px] font-semibold h-10 px-4 rounded-md transition-all flex items-center gap-2"
                            >
                                <X className="h-4 w-4" />
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-white hover:bg-gray-100 text-black text-[14px] font-semibold h-10 px-6 rounded-md transition-all shadow-md flex items-center gap-2"
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-gray-50 bg-white gap-6">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-black">Detail Perusahaan</h3>
                            <p className="text-[14px] font-medium text-gray-500">Informasi resmi agensi yang akan ditampilkan pada sistem dan agen-agen asuransi</p>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        {editDraftRestored && isEditing && (
                            <div className="flex items-center justify-between gap-3 px-4 py-2.5 mb-4 rounded-md bg-white border border-amber-200 text-amber-800 text-sm">
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4 shrink-0" />
                                    <span className="font-medium">Perubahan yang belum disimpan dipulihkan.</span>
                                </div>
                                <button onClick={() => setEditDraftRestored(false)} className="text-amber-600 hover:text-amber-900"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        )}
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
                                    className="rounded-md border-gray-200 text-sm focus:border-gray-400 max-w-sm font-semibold"
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
                                    className="rounded-md border-gray-200 text-sm focus:border-gray-400 min-h-[100px] max-w-lg"
                                />
                            }
                        />

                        {!profile.agency_id && !isEditing && (
                            <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-md flex items-start gap-4">
                                <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-red-900">Akun Belum Tertaut Sistem Agensi</h4>
                                    <p className="text-sm text-red-700 mt-1">Harap hubungi Developer untuk menghubungkan akun admin ini dengan database agensi yang valid.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Template Claim Form Section */}
                    {profile.agency_id && !isEditing && (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-y border-gray-50 bg-white gap-6 mt-4">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-xl font-bold text-black">Template Form Klaim</h3>
                                    <p className="text-[14px] font-medium text-gray-500">Unggah template PDF form klaim agensi Anda untuk diunduh oleh agen-agen asuransi.</p>
                                </div>
                            </div>
                            <div className="p-4 sm:p-8">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 border border-gray-200 rounded-md bg-white shadow-sm">
                                    <div className="h-14 w-14 rounded-md bg-white flex items-center justify-center shrink-0">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-black">Dokumen Template Saat Ini</h4>
                                        {profile.claim_form_url ? (
                                            <a href={profile.claim_form_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
                                                Lihat Dokumen
                                            </a>
                                        ) : (
                                            <p className="text-sm text-gray-500 mt-1 italic">Belum ada template yang diunggah.</p>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <input
                                            type="file"
                                            id="template-upload"
                                            className="hidden"
                                            accept="application/pdf,image/*"
                                            onChange={handleUploadTemplate}
                                            disabled={uploadingTemplate}
                                        />
                                        <label htmlFor="template-upload">
                                            <Button asChild disabled={uploadingTemplate} variant="outline" className="cursor-pointer gap-2 rounded-md">
                                                <span>
                                                    {uploadingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                    Unggah Template
                                                </span>
                                            </Button>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Branding & Customization Section */}
            {profile.agency_id && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-gray-50 bg-white gap-4">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-bold text-black flex items-center gap-2">
                                <Palette className="h-5 w-5 text-gray-500" />
                                Branding & Kustomisasi
                            </h3>
                            <p className="text-[14px] font-medium text-gray-500">Sesuaikan logo, warna, dan URL path untuk dashboard agent Anda.</p>
                        </div>
                        {!showBrandingEdit && (
                            <button
                                onClick={handleStartBrandingEdit}
                                className="bg-gray-50 hover:bg-white text-black text-[14px] font-semibold h-10 px-5 rounded-md border border-gray-200 flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                            >
                                <Edit2 className="h-4 w-4" />
                                Edit Branding
                            </button>
                        )}
                    </div>

                    <div className="p-4 sm:p-8">
                        {brandingLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {brandingDraftRestored && showBrandingEdit && (
                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md bg-white border border-amber-200 text-amber-800 text-sm">
                                        <div className="flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4 shrink-0" />
                                            <span className="font-medium">Perubahan branding yang belum disimpan dipulihkan.</span>
                                        </div>
                                        <button onClick={() => setBrandingDraftRestored(false)} className="text-amber-600 hover:text-amber-900"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                )}
                                {/* Agency Slug / Path */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                        <Link2 className="h-3.5 w-3.5" /> Custom Path (URL)
                                    </label>
                                    {showBrandingEdit ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400">asistenqu.com/</span>
                                            <Input
                                                value={branding.slug}
                                                onChange={e => setBranding({ ...branding, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                                                placeholder="nama-agensi"
                                                className="rounded-md max-w-xs text-sm"
                                            />
                                            <span className="text-sm text-gray-400">/agent</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-black bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-md w-fit">
                                            asistenqu.com/<span className="font-bold text-blue-600">{branding.slug || "—"}</span>/agent
                                        </p>
                                    )}
                                </div>

                                {/* Logo URL */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-medium text-gray-500">Logo URL</label>
                                    {showBrandingEdit ? (
                                        <Input
                                            value={branding.logoUrl}
                                            onChange={e => setBranding({ ...branding, logoUrl: e.target.value })}
                                            placeholder="https://example.com/logo.png"
                                            className="rounded-md max-w-lg text-sm"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            {branding.logoUrl ? (
                                                <img src={branding.logoUrl} alt="Logo" className="h-10 w-auto object-contain bg-gray-50 border border-gray-200 rounded-lg px-3 py-1" />
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">Belum ada logo — menggunakan default AsistenQu.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Colors */}
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-3 block">Warna Dashboard</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {[
                                            { key: "primaryColor", label: "Primary", desc: "Warna utama (header, tombol)" },
                                            { key: "accentColor", label: "Accent", desc: "Warna aksen (link, badge)" },
                                            { key: "sidebarBg", label: "Sidebar BG", desc: "Background sidebar" },
                                            { key: "sidebarText", label: "Sidebar Text", desc: "Teks sidebar" },
                                            { key: "loginBg", label: "Login BG", desc: "Background halaman login" },
                                            { key: "secondaryColor", label: "Secondary", desc: "Warna sekunder" },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-8 w-8 rounded-lg border border-gray-200 shadow-inner shrink-0"
                                                        style={{ backgroundColor: branding[key as keyof typeof branding] }}
                                                    />
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-700">{label}</p>
                                                        <p className="text-[10px] text-gray-400">{desc}</p>
                                                    </div>
                                                </div>
                                                {showBrandingEdit && (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={branding[key as keyof typeof branding]}
                                                            onChange={e => setBranding({ ...branding, [key]: e.target.value })}
                                                            className="h-8 w-10 rounded border border-gray-200 cursor-pointer"
                                                        />
                                                        <Input
                                                            value={branding[key as keyof typeof branding]}
                                                            onChange={e => setBranding({ ...branding, [key]: e.target.value })}
                                                            className="rounded-lg text-xs h-8 max-w-[100px]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                {showBrandingEdit && (
                                    <div className="mt-4 p-4 border border-gray-200 rounded-md bg-white">
                                        <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                                            <Eye className="h-3.5 w-3.5" /> Preview Sidebar
                                        </p>
                                        <div
                                            className="w-48 h-40 rounded-md shadow-lg flex flex-col p-4 gap-2"
                                            style={{ backgroundColor: branding.sidebarBg, color: branding.sidebarText }}
                                        >
                                            {branding.logoUrl ? (
                                                <img src={branding.logoUrl} alt="Preview" className="h-6 w-auto object-contain" />
                                            ) : (
                                                <div className="text-sm font-bold" style={{ color: branding.primaryColor }}>Agency Logo</div>
                                            )}
                                            <div className="flex flex-col gap-1 mt-2">
                                                <div className="h-3 rounded-full w-24" style={{ backgroundColor: branding.accentColor, opacity: 0.2 }} />
                                                <div className="h-3 rounded-full w-20" style={{ backgroundColor: branding.sidebarText, opacity: 0.1 }} />
                                                <div className="h-3 rounded-full w-28" style={{ backgroundColor: branding.sidebarText, opacity: 0.1 }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Save/Cancel */}
                                {showBrandingEdit && (
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <Button variant="outline" onClick={() => { localStorage.removeItem(AGENCY_BRANDING_DRAFT_KEY); setShowBrandingEdit(false); setBrandingDraftRestored(false); fetchBranding(); }} className="rounded-md">
                                            Batal
                                        </Button>
                                        <Button onClick={handleBrandingSave} disabled={brandingSaving} className="bg-black hover:bg-gray-800 rounded-md gap-2">
                                            {brandingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Simpan Branding
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
