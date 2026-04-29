"use client";

import { useEffect, useState } from "react";
import {
    Copy, Check, Gift, TrendingUp, Users, Star, Share2, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ReferralData = {
    referral_code: string | null;
    referral_points: number;
    wallet_balance: number;
    stats: {
        credited_count: string;
        pending_count: string;
        total_referrals: string;
        total_earned_rupiah: string;
        total_earned_points: string;
    };
    recent_referrals: {
        reward_id: string;
        reward_amount: number;
        reward_points: number;
        status: string;
        created_at: string;
        referred_email: string;
    }[];
};

export default function ReferralPage({ initialData }: { initialData: ReferralData | null }) {
    const { toast } = useToast();
    const [data, setData] = useState<ReferralData | null>(initialData);
    const [loading, setLoading] = useState(!initialData);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (initialData) {
            setLoading(false);
            return;
        }
        fetch("/api/agent/referral")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setData(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [initialData]);

    const copyCode = () => {
        if (!data?.referral_code) return;
        navigator.clipboard.writeText(data.referral_code);
        setCopied(true);
        toast({ title: "Kode disalin!", description: `Kode referral ${data.referral_code} berhasil disalin.` });
        setTimeout(() => setCopied(false), 2000);
    };

    const generateCode = async () => {
        setGenerating(true);
        try {
            const res = await fetch("/api/agent/referral", { method: "POST" });
            if (!res.ok) throw new Error("Gagal membuat kode");
            const d = await res.json();
            setData(prev => prev ? { ...prev, referral_code: d.referral_code } : null);
            toast({ title: "Berhasil!", description: "Kode referral berhasil dibuat." });
        } catch (e: any) {
            toast({ title: "Gagal", description: e.message, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const shareCode = () => {
        if (!data?.referral_code) return;
        const text = `Halo rekan agen! Gabung di AsistenQu pakai kode referral saya: ${data.referral_code}\n\nPlatform manajemen klien & klaim asuransi — bantu kamu kelola nasabah jauh lebih mudah.`;
        if (navigator.share) {
            navigator.share({ title: "Referral AsistenQu", text });
        } else {
            navigator.clipboard.writeText(text);
            toast({ title: "Link tersalin!", description: "Teks referral berhasil disalin." });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
            </div>
        );
    }

    const stats = data?.stats;
    const totalReferrals = parseInt(stats?.total_referrals ?? "0");
    const creditedCount = parseInt(stats?.credited_count ?? "0");
    const totalEarnedPoints = parseInt(stats?.total_earned_points ?? "0");

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Gift className="h-3.5 w-3.5" />
                        Program Referral
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Kode Referral Agen</h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        Ajak sesama agen bergabung di AsistenQu dan dapatkan <span className="font-semibold text-gray-700">poin reward</span> setiap ada agen baru mendaftar menggunakan kode Anda.
                    </p>
                </div>
            </div>

            {/* Referral Code Card & Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 relative bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Star className="h-5 w-5 text-gray-900" />
                        </div>
                        <div>
                            <p className="text-gray-900 font-bold text-lg">Kode Eksklusif Anda</p>
                            <p className="text-gray-500 text-sm">Gunakan kode ini saat pendaftaran</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 flex items-center justify-center sm:justify-start">
                            <span className={cn("font-bold tracking-[0.2em] uppercase", data?.referral_code ? "text-4xl text-gray-900" : "text-xl text-gray-400")}>
                                {data?.referral_code ?? "BELUM DIBUAT"}
                            </span>
                        </div>
                        <div className="flex sm:flex-col gap-3 w-full sm:w-auto">
                            {!data?.referral_code ? (
                                <Button
                                    onClick={generateCode}
                                    disabled={generating}
                                    className="w-full bg-gray-900 text-white hover:bg-black gap-2 rounded-xl h-14 px-8 shadow-sm transition-all"
                                >
                                    {generating ? "Membuat..." : "Buat Kode Referral"}
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={copyCode}
                                        className="flex-1 sm:flex-none bg-gray-900 text-white hover:bg-black gap-2 rounded-xl h-14 px-8 shadow-sm transition-all"
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copied ? "Disalin!" : "Salin"}
                                    </Button>
                                    <Button
                                        onClick={shareCode}
                                        variant="outline"
                                        className="flex-1 sm:flex-none border-gray-200 text-gray-700 hover:bg-gray-50 gap-2 rounded-xl h-14 px-8 transition-all"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        Bagikan
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Main Reward Stats */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col justify-center"
                >
                    <div className="mb-6">
                        <p className="text-gray-500 font-medium mb-1 flex items-center gap-1.5">
                            <Award className="h-4 w-4" /> Total Poin Terkumpul
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-4xl font-bold tabular-nums text-gray-900 tracking-tight">
                                {totalEarnedPoints.toLocaleString("id-ID")}
                            </p>
                            <span className="text-gray-400 font-semibold">poin</span>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-gray-100">
                        <p className="text-gray-500 font-medium mb-1">Poin Aktif</p>
                        <p className="text-2xl font-bold tabular-nums text-gray-900">
                            {(data?.referral_points ?? 0).toLocaleString("id-ID")} <span className="text-gray-400 font-medium text-sm">poin</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-2 leading-snug">Poin digunakan sebagai reward aktivitas di platform. Tidak ada nominal uang yang ditampilkan di halaman ini.</p>
                    </div>
                </motion.div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { icon: Users, label: "Total Dibagikan", value: totalReferrals },
                    { icon: Check, label: "Berhasil Daftar", value: creditedCount },
                    { icon: TrendingUp, label: "Menunggu Verifikasi", value: parseInt(stats?.pending_count ?? "0") },
                    { icon: Star, label: "Poin Aktif", value: (data?.referral_points ?? 0).toLocaleString("id-ID") },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                            <s.icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <p className="text-3xl font-bold tabular-nums text-gray-900 tracking-tight mb-1">{s.value}</p>
                        <p className="text-[14px] font-medium text-gray-500">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-8">Cara Kerja Program Referral</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            step: "1",
                            icon: Share2,
                            title: "Bagikan ke Sesama Agen",
                            desc: "Kirimkan kode eksklusif Anda ke rekan agen lain yang tertarik bergabung di AsistenQu.",
                        },
                        {
                            step: "2",
                            icon: Users,
                            title: "Mereka Mendaftar",
                            desc: "Agen baru mendaftar memakai kode unik Anda dan mulai mengelola klien di platform.",
                        },
                        {
                            step: "3",
                            icon: Award,
                            title: "Dapatkan Poin Reward",
                            desc: "Poin otomatis masuk ke akun Anda setiap agen baru berhasil terdaftar. Poin dapat ditukar untuk benefit platform.",
                        },
                    ].map((step, i) => (
                        <motion.div
                            key={step.step}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex flex-col gap-4"
                        >
                            <div className="h-12 w-12 rounded-2xl bg-gray-900 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                                {step.step}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-[15px] leading-relaxed text-gray-500">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Recent Referrals Table */}
            {(data?.recent_referrals?.length ?? 0) > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-6 border-b border-gray-50 bg-gray-50/30">
                        <h2 className="text-lg font-bold text-gray-900">Riwayat Referral Terbaru</h2>
                        <p className="text-[14px] text-gray-500 mt-1">Daftar pengguna yang mendaftar menggunakan kode Anda.</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {data!.recent_referrals.map((ref, i) => (
                            <motion.div
                                key={ref.reward_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:px-8 hover:bg-gray-50/50 transition-colors gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0">
                                        <Users className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[15px] font-bold text-gray-900">{ref.referred_email}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[13px] font-medium text-gray-500 border border-gray-200 bg-white px-2 py-0.5 rounded-md">
                                                {new Date(ref.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                    <p className={cn(
                                        "text-[11px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border",
                                        ref.status === "CREDITED"
                                            ? "bg-gray-900 text-white border-gray-900"
                                            : ref.status === "PENDING"
                                                ? "bg-white text-gray-600 border-gray-200"
                                                : "bg-gray-50 text-gray-400 border-gray-100"
                                    )}>
                                        {ref.status === "CREDITED" ? "Berhasil" : ref.status === "PENDING" ? "Menunggu" : "Dibatalkan"}
                                    </p>
                                    {ref.status === "CREDITED" && (
                                        <p className="text-[13px] font-semibold text-gray-900 mt-2">
                                            <span className="text-amber-600">+{ref.reward_points.toLocaleString("id-ID")} poin</span>
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
