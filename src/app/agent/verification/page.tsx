"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, CheckCircle2, ArrowRight, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FullScreenCamera } from "@/components/ui/fullscreen-camera";

type UserProfile = {
    full_name: string;
    phone_number: string;
    nik: string;
    address: string;
    birth_date: string;
    gender: string;
    ktp_image_path: string | null;
    selfie_image_path: string | null;
    status: string;
};

// ... Guides are now images
function KTPGuide() {
    return (
        <div className="relative w-full aspect-video flex items-center justify-center overflow-hidden bg-muted/10 rounded-lg">
            <Image
                src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_vercard.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX3ZlcmNhcmQucG5nIiwiaWF0IjoxNzcwODc5OTE4LCJleHAiOjQ4OTI5NDM5MTh9.jCoMBYo875Pqp3KIcHYA74dmODJu97X8hvAmAiSSON4"
                alt="Panduan Foto KTP"
                fill
                className="object-contain p-4"
            />
        </div>
    );
}

function SelfieGuide() {
    return (
        <div className="relative w-full aspect-video flex items-center justify-center overflow-hidden bg-muted/10 rounded-lg">
            <Image
                src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_vercardhold.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX3ZlcmNhcmRob2xkLnBuZyIsImlhdCI6MTc3MDg3OTk2MiwiZXhwIjo0ODkyOTQzOTYyfQ.5mnbNOxMHksJQtUdiR8nAz8luB2n3lEzdwiVF4WX5mw"
                alt="Panduan Selfie KTP"
                fill
                className="object-contain p-4"
            />
        </div>
    );
}

export default function AgentVerificationPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Form data
    const [ktpBase64, setKtpBase64] = useState<string | null>(null);
    const [selfieBase64, setSelfieBase64] = useState<string | null>(null);

    // Camera Active State
    const [showCamera, setShowCamera] = useState<'ktp' | 'selfie' | null>(null);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/agent/profile");
            if (res.status === 401) {
                router.push("/agent/login");
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                if (data.status === "ACTIVE") {
                    router.push("/agent");
                }
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
            toast({ title: "Error", description: "Gagal memuat data profil", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleCameraCapture = (base64: string) => {
        if (showCamera === 'ktp') {
            setKtpBase64(base64);
        } else if (showCamera === 'selfie') {
            setSelfieBase64(base64);
        }
        setShowCamera(null); // Close camera
        toast({ title: "Foto Berhasil Diambil", description: "Silakan lanjutkan." });
    };

    const handleSubmit = async () => {
        const hasKtp = ktpBase64 || profile?.ktp_image_path;
        const hasSelfie = selfieBase64 || profile?.selfie_image_path;

        if (!hasKtp) {
            toast({ title: "Perhatian", description: "Foto KTP wajib diambil", variant: "destructive" });
            return;
        }
        if (!hasSelfie) {
            toast({ title: "Perhatian", description: "Foto Selfie wajib diambil", variant: "destructive" });
            return;
        }

        if (!profile) return;

        setUploading(true);
        try {
            const res = await fetch("/api/agent/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName: profile.full_name,
                    phone: profile.phone_number,
                    nik: profile.nik,
                    address: profile.address,
                    birthDate: profile.birth_date,
                    gender: profile.gender,
                    ktp_image: ktpBase64,
                    selfie_image: selfieBase64,
                }),
            });

            if (res.ok) {
                setMessage("Dokumen berhasil diupload! Akun Anda sedang dalam proses verifikasi.");
                setKtpBase64(null);
                setSelfieBase64(null);
                fetchProfile();
                window.scrollTo(0, 0);
            } else {
                const data = await res.json();
                toast({ title: "Gagal", description: data.error || "Gagal mengupload dokumen", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Helper for image path
    const getImagePath = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith("public/")) return "/" + path.substring(7);
        return path;
    };

    // Logout Handler
    const handleLogout = async () => {
        // Simple client-side logout or redirect
        // Ideally call an API to clear cookies
        try {
            await fetch("/api/agent/logout", { method: "POST" });
        } catch (e) {
            // ignore
        }
        router.push("/agent/login");
    };

    // Render Camera Overlay
    if (showCamera) {
        return (
            <FullScreenCamera
                mode={showCamera === 'ktp' ? 'environment' : 'user'}
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(null)}
            />
        );
    }

    // Pending Verification View (Mascot)
    if (message || (profile?.ktp_image_path && profile?.selfie_image_path)) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] w-full p-6 text-center animate-in fade-in duration-500">
                <div className="relative w-70 h-40 mb-6">
                    <Image
                        src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_wait.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX3dhaXQucG5nIiwiaWF0IjoxNzcwOTM0MjM0LCJleHAiOjQ4OTI5OTgyMzR9.zXSBEwSanyGeLBFmdzozNMzni5w8i0WApGgAEDZ9ZXU"
                        alt="Pending Review Mascot"
                        fill
                        className="object-contain drop-shadow-xl"
                        priority
                    />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 text-foreground">Akun mu masih dalam peninjauan</h1>
                <p className="text-muted-foreground mb-8 text-lg font-medium max-w-md mx-auto">
                    Tim kami sedang memverifikasi data Anda. Mohon tunggu persetujuan admin.
                </p>

                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="rounded-full px-8"
                >
                    Logout
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-500 py-10">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Verifikasi Identitas</h1>
                <p className="text-muted-foreground text-sm">
                    Mohon lengkapi dokumen berikut untuk mengaktifkan akun Agen Anda.
                </p>
            </div>

            <div className="w-full space-y-8">
                {/* KTP Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">1. Foto KTP</h3>
                    </div>

                    {!ktpBase64 ? (
                        <div onClick={() => setShowCamera('ktp')} className="cursor-pointer">
                            <KTPGuide />
                        </div>
                    ) : (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-black/5">
                            <Image
                                src={ktpBase64}
                                alt="Preview KTP"
                                fill
                                className="object-contain"
                            />
                            <button
                                onClick={() => setKtpBase64(null)}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <Button
                        onClick={() => setShowCamera('ktp')}
                        variant="outline"
                        className="w-full h-12 gap-2 text-base"
                    >
                        {ktpBase64 ? (
                            <>
                                <Camera className="w-4 h-4" /> Ambil Ulang Foto
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4" /> Ambil Foto KTP
                            </>
                        )}
                    </Button>
                </div>

                {/* Selfie Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">2. Selfie dengan KTP</h3>
                    </div>

                    {!selfieBase64 ? (
                        <div onClick={() => setShowCamera('selfie')} className="cursor-pointer">
                            <SelfieGuide />
                        </div>
                    ) : (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-black/5">
                            <Image
                                src={selfieBase64}
                                alt="Preview Selfie"
                                fill
                                className="object-contain"
                            />
                            <button
                                onClick={() => setSelfieBase64(null)}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <Button
                        onClick={() => setShowCamera('selfie')}
                        variant="outline"
                        className="w-full h-12 gap-2 text-base"
                    >
                        {selfieBase64 ? (
                            <>
                                <Camera className="w-4 h-4" /> Ambil Ulang Selfie
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4" /> Ambil Selfie
                            </>
                        )}
                    </Button>
                </div>

                {/* Submit Button */}
                <div className="pt-6 pb-20">
                    <Button
                        onClick={handleSubmit}
                        className="w-full h-14 text-lg font-bold"
                        size="lg"
                        disabled={uploading || (!ktpBase64 && !selfieBase64)}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Mengupload...
                            </>
                        ) : (
                            <>
                                Kirim Dokumen Verifikasi <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        Data Anda aman dan terenkripsi. Hanya digunakan untuk verifikasi identitas.
                    </p>
                </div>
            </div>
        </div>
    );
}
