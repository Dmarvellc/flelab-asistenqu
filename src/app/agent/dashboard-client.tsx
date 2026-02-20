"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { ArrowRight, LayoutDashboard, FileText, Users, Award } from "lucide-react";
import Link from "next/link";
import { ClaimsList } from "@/components/dashboard/claims-list";

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
        <div className="flex flex-col gap-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 to-black p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-800 text-white relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />

                <div className="relative z-10">
                    <p className="text-sm text-gray-400 font-medium mb-1">{t.welcome},</p>
                    <h1 className="text-2xl font-bold tracking-tight mb-1">
                        {initialAgentName}
                    </h1>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <Link href="/agent/claims/new">
                        <button className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium h-10 px-5 rounded-xl backdrop-blur-sm transition-all shadow-sm">
                            {t.newClaim}
                        </button>
                    </Link>
                    <Link href="/agent/clients/new">
                        <button className="bg-white hover:bg-gray-100 text-black text-sm font-semibold h-10 px-5 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                            {t.addClient}
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats with Hover Animation */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, i) => (
                    <div
                        key={stat.label}
                        className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 rounded-xl bg-gray-50 text-gray-900 transition-colors duration-300">
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-gray-900 tracking-tight tabular-nums mb-1">{stat.value}</div>
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Claims list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-md">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-black"></div>
                        {t.recentClaims}
                    </h2>
                    <Link href="/agent/claims">
                        <button className="text-sm font-medium text-gray-400 hover:text-black flex items-center gap-1.5 transition-colors group">
                            {t.viewAll}
                            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </button>
                    </Link>
                </div>
                <div className="p-2 sm:p-4">
                    <ClaimsList role="agent" claims={claims} />
                </div>
            </div>
        </div>
    );
}
