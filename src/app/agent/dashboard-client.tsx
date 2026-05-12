"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { ArrowRight, FileText, Users, Award, PhoneCall } from "lucide-react";
import Link from "next/link";
import { ClaimsList } from "@/components/dashboard/claims-list";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RemindersWidget } from "@/components/dashboard/reminders-widget";
import { PageShell, PageHeader, StatCard, StatsGrid, CardShell, CardHeader } from "@/components/dashboard/page-shell";

interface DashboardClientProps {
    metrics: {
        activeClients: number;
        pendingContracts: number;
        totalClaims: number;
        points: number;
        chartData: { name: string; claims: number; clients: number; }[];
    };
    claims: any[];
    initialAgentName: string;
    insuranceName?: string | null;
}

export function DashboardClient({ metrics, claims, initialAgentName, insuranceName }: DashboardClientProps) {
    const { t } = useTranslation();

    return (
        <PageShell>
            <PageHeader
                title="Ringkasan Dashboard"
                description="Pantau aktivitas, klaim, dan performa Anda secara ringkas hari ini."
                actions={
                    <>
                        <Link href="/agent/claims/new">
                            <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-medium h-9 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
                                {t.newClaim}
                            </button>
                        </Link>
                        <Link href="/agent/clients/new">
                            <button className="bg-gray-900 hover:bg-black text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
                                {t.addClient}
                            </button>
                        </Link>
                    </>
                }
            />

            {/* Stats */}
            <StatsGrid cols={4}>
                <StatCard label={t.activeClients} value={metrics.activeClients} icon={Users} />
                <StatCard
                    label={t.pendingPolicies}
                    value={metrics.pendingContracts}
                    icon={FileText}
                    description="Biasanya karena kekurangan dokumen"
                />
                <StatCard label={t.totalClaims} value={metrics.totalClaims} icon={FileText} />
                <StatCard label={t.points} value={metrics.points} icon={Award} />
            </StatsGrid>

            {/* Generali Call Center Banner */}
            {insuranceName?.toLowerCase().includes('generali') && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="h-10 w-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center shrink-0">
                            <PhoneCall className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Butuh bantuan klaim pending?</p>
                            <p className="text-sm text-gray-500 mt-0.5">Hubungi Admin Generali untuk konsultasi cepat.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <a href="tel:02129963700" className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto">
                            021-29963700
                        </a>
                        <a href="tel:02129021616" className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto">
                            021-29021616
                        </a>
                    </div>
                </div>
            )}

            {/* Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CardShell className="lg:col-span-2">
                    <CardHeader title="Grafik Performa" />
                    <div className="p-6">
                        <PerformanceChart data={metrics.chartData} />
                    </div>
                </CardShell>

                <CardShell>
                    <CardHeader title="Tingkatkan Performa" />
                    <div className="p-5 flex flex-col gap-3">
                        <p className="text-sm text-gray-500">Capai target bulan ini untuk menaikkan peringkat dan kumpulkan lebih banyak poin.</p>
                        <div className="flex flex-col gap-2 mt-2">
                            <Link href="/agent/clients/new" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-900">Tambah Klien Baru</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                            <Link href="/agent/referral" className="flex items-center justify-between p-3 rounded-lg bg-gray-900 hover:bg-black text-white border border-gray-900 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Award className="h-4 w-4 text-gray-300" />
                                    <span className="text-sm font-medium">Bagikan Referral</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </CardShell>
            </div>

            {/* Reminders */}
            <RemindersWidget />

            {/* Claims */}
            <CardShell>
                <CardHeader
                    title={t.recentClaims}
                    actions={
                        <Link href="/agent/claims">
                            <button className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
                                {t.viewAll} <ArrowRight className="h-3 w-3" />
                            </button>
                        </Link>
                    }
                />
                <div className="p-4 sm:p-5">
                    <ClaimsList role="agent" claims={claims} />
                </div>
            </CardShell>
        </PageShell>
    );
}
