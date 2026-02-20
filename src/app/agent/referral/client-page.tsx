"use client";

import { useEffect, useState } from "react";
import {
    Copy, Check, Gift, TrendingUp, Users, Star, Share2, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ReferralData = {
    referral_code: string | null;
    referral_points: number;
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

    const shareCode = () => {
        if (!data?.referral_code) return;
        const text = `Daftar AsistenQu sekarang dan gunakan kode referral saya: ${data.referral_code}\n\nKelola asuransi lebih mudah bersama AsistenQu!`;
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
    const totalEarnedRupiah = parseInt(stats?.total_earned_rupiah ?? "0");
    const totalEarnedPoints = parseInt(stats?.total_earned_points ?? "0");

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                    <Gift className="h-3 w-3" />
                    <span>Program Referral</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kode Referral Anda</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Bagikan kode referral dan dapatkan reward setiap kali ada yang bergabung.
                </p>
            </div>

            {/* Referral Code Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-black rounded-2xl p-8"
            >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white transform translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white transform -translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="relative">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <Star className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-white/70 text-sm font-medium">Kode Referral Eksklusif</p>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 bg-white/10 rounded-xl px-5 py-4 font-mono text-3xl font-bold text-white tracking-[0.2em]">
                            {data?.referral_code ?? "—"}
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                onClick={copyCode}
                                className="bg-white text-black hover:bg-white/90 gap-2 rounded-xl h-12 px-5"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Disalin!" : "Salin"}
                            </Button>
                            <Button
                                onClick={shareCode}
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10 gap-2 rounded-xl h-12 px-5"
                            >
                                <Share2 className="h-4 w-4" />
                                Bagikan
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white/10 rounded-xl px-4 py-3">
                            <p className="text-white/50 text-xs">Total Reward</p>
                            <p className="text-white font-bold text-lg">
                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalEarnedRupiah)}
                            </p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-3">
                            <p className="text-white/50 text-xs">Poin Referral</p>
                            <p className="text-white font-bold text-lg">{totalEarnedPoints.toLocaleString("id-ID")}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-3 col-span-2 sm:col-span-1">
                            <p className="text-white/50 text-xs">Berhasil Referral</p>
                            <p className="text-white font-bold text-lg">{creditedCount} <span className="text-sm font-normal text-white/50">orang</span></p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Cara Kerja Referral</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            step: "1",
                            icon: Share2,
                            title: "Bagikan Kode",
                            desc: "Kirimkan kode referral unik Anda ke calon nasabah atau agen baru.",
                        },
                        {
                            step: "2",
                            icon: Users,
                            title: "Mereka Daftar",
                            desc: "Orang yang Anda referensikan mendaftar menggunakan kode Anda.",
                        },
                        {
                            step: "3",
                            icon: Banknote,
                            title: "Anda Dapat Reward",
                            desc: "Anda otomatis mendapat Rp 1.000 dan 10 poin setiap referral berhasil.",
                        },
                    ].map((step, i) => (
                        <motion.div
                            key={step.step}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-3"
                        >
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center">
                                {step.step}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: Users, label: "Total Referral", value: totalReferrals },
                    { icon: Check, label: "Berhasil", value: creditedCount },
                    { icon: TrendingUp, label: "Pending", value: parseInt(stats?.pending_count ?? "0") },
                    { icon: Star, label: "Poin Terkumpul", value: (data?.referral_points ?? 0).toLocaleString("id-ID") },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl border border-gray-100 px-5 py-4"
                    >
                        <s.icon className="h-4 w-4 text-gray-400 mb-2" />
                        <p className="text-2xl font-bold tabular-nums text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Recent Referrals Table */}
            {(data?.recent_referrals?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="text-sm font-semibold text-gray-900">Riwayat Referral</h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {data!.recent_referrals.map((ref, i) => (
                            <motion.div
                                key={ref.reward_id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-4 px-5 py-3"
                            >
                                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-gray-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{ref.referred_email}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(ref.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                                        ref.status === "CREDITED"
                                            ? "bg-green-50 text-green-700"
                                            : ref.status === "PENDING"
                                                ? "bg-yellow-50 text-yellow-700"
                                                : "bg-gray-100 text-gray-500"
                                    )}>
                                        {ref.status === "CREDITED" ? "Berhasil" : ref.status === "PENDING" ? "Pending" : "Dibatalkan"}
                                    </p>
                                    {ref.status === "CREDITED" && (
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            +Rp {ref.reward_amount.toLocaleString("id-ID")} • +{ref.reward_points} poin
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
