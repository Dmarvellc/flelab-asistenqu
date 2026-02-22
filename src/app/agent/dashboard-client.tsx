"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { ArrowRight, LayoutDashboard, FileText, Users, Award } from "lucide-react";
import Link from "next/link";
import { ClaimsList } from "@/components/dashboard/claims-list";
import { PerformanceChart } from "@/components/dashboard/performance-chart";

interface DashboardClientProps {
    metrics: {
        activeClients: number;
        pendingContracts: number;
        totalClaims: number;
        points: number;
    };
    claims: any[];
    initialAgentName: string;
}

export function DashboardClient({ metrics, claims, initialAgentName }: DashboardClientProps) {
    const { t } = useTranslation();

    const stats = [
        { label: t.activeClients, value: metrics.activeClients, icon: Users },
        { label: t.pendingPolicies, value: metrics.pendingContracts, icon: FileText },
        { label: t.totalClaims, value: metrics.totalClaims, icon: LayoutDashboard },
        { label: t.points, value: metrics.points, icon: Award },
    ];

    return (
        <div className="flex flex-col gap-10">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mt-2">Ringkasan Dashboard</h1>
                    <p className="mt-1 text-base text-gray-500">Pantau aktivitas, klaim, dan performa Anda secara ringkas hari ini.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
                    <Link href="/agent/claims/new">
                        <button className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-[14px] font-semibold h-11 px-6 rounded-xl transition-all shadow-sm">
                            {t.newClaim}
                        </button>
                    </Link>
                    <Link href="/agent/clients/new">
                        <button className="bg-gray-900 hover:bg-black text-white text-[14px] font-semibold h-11 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                            {t.addClient}
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 relative overflow-hidden"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
                        <div className="relative z-10 flex justify-between items-start mb-8">
                            <div className="p-4 rounded-2xl bg-gray-50 text-gray-900 transition-colors duration-300 border border-gray-100 group-hover:bg-white group-hover:shadow-sm">
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="relative z-10 text-[40px] font-bold text-gray-900 tracking-tight tabular-nums mb-3 leading-none">{stat.value}</div>
                        <p className="relative z-10 text-base font-medium text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions & Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-white">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"></div>
                            Grafik Performa
                        </h2>
                    </div>
                    <div className="p-6">
                        <PerformanceChart />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ayo Tingkatkan Performa!</h3>
                    <p className="text-[15px] text-gray-500 mb-8 leading-relaxed">Capai target bulan ini untuk menaikkan peringkat kejuaraan dan kalikan komisi Anda.</p>

                    <div className="space-y-4">
                        <Link href="/agent/clients/new" className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Users className="h-5 w-5 text-gray-600" />
                                </div>
                                <span className="font-semibold text-gray-900">Tambah Klien Baru</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all" />
                        </Link>

                        <Link href="/agent/referral" className="flex items-center justify-between p-4 rounded-2xl bg-black text-white hover:bg-gray-900 border border-gray-900 transition-colors group shadow-md hover:shadow-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    <Award className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-semibold text-white">Bagikan Referral Kami</span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Claims list */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-md">
                <div className="px-8 py-8 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-900 shadow-[0_0_12px_rgba(0,0,0,0.2)]"></div>
                        {t.recentClaims}
                    </h2>
                    <Link href="/agent/claims">
                        <button className="text-[15px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors group px-4 py-2 rounded-xl hover:bg-gray-50">
                            {t.viewAll}
                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>
                <div className="p-4 sm:p-6 lg:p-8">
                    <ClaimsList role="agent" claims={claims} />
                </div>
            </div>
        </div>
    );
}
