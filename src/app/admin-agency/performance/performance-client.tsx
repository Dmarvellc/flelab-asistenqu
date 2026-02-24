"use client";

import { useState } from "react";
import {
    Trophy, TrendingUp, Star, Users, FileText,
    CheckCircle2, XCircle, Clock, Copy, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "motion/react";
import { AgentPerf } from "@/services/admin-agency";

const rankColors: Record<string, string> = {
    "Bronze": "text-gray-600 bg-gray-50 border border-gray-200",
    "Silver": "text-gray-700 bg-gray-100 border border-gray-300",
    "Gold": "text-gray-900 bg-gray-200 border border-gray-400",
    "Platinum": "text-white bg-gray-800 border border-gray-800",
    "Diamond": "text-white bg-black border border-black",
    "Bronze Agent": "text-gray-600 bg-gray-50 border border-gray-200",
    "Silver Agent": "text-gray-700 bg-gray-100 border border-gray-300",
    "Gold Agent": "text-gray-900 bg-gray-200 border border-gray-400",
    "Platinum Agent": "text-white bg-gray-800 border border-gray-800",
};

export default function AdminAgentPerformanceClient({ initialAgents }: { initialAgents: AgentPerf[] }) {
    const { toast } = useToast();
    const [agents] = useState<AgentPerf[]>(initialAgents);
    const [sortKey, setSortKey] = useState<keyof AgentPerf>("total_points");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const sorted = [...agents].sort((a, b) => {
        const av = a[sortKey] as number | string;
        const bv = b[sortKey] as number | string;
        if (typeof av === "number" && typeof bv === "number") {
            return sortDir === "desc" ? bv - av : av - bv;
        }
        return sortDir === "desc"
            ? String(bv).localeCompare(String(av))
            : String(av).localeCompare(String(bv));
    });

    const toggleSort = (key: keyof AgentPerf) => {
        if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const SortIcon = ({ k }: { k: keyof AgentPerf }) => {
        if (sortKey !== k) return null;
        return sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />;
    };

    const totalAgents = agents.length;
    const totalApprovedValue = agents.reduce((s, a) => s + (a.total_approved_value || 0), 0);
    const avgPoints = totalAgents > 0 ? Math.round(agents.reduce((s, a) => s + (a.total_points || 0), 0) / totalAgents) : 0;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3 shadow-sm">
                    <Trophy className="h-3 w-3" />
                    <span>Performa Agen</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Performa Agen</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Pantau kinerja, poin, rank, dan komisi agen dalam agensi Anda.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Agen", value: totalAgents, icon: Users },
                    { label: "Avg Poin", value: avgPoints.toLocaleString("id-ID"), icon: Star },
                    { label: "Nilai Klaim Disetujui", value: new Intl.NumberFormat("id-ID", { notation: "compact", style: "currency", currency: "IDR" }).format(totalApprovedValue), icon: TrendingUp },
                    { label: "Total Klaim", value: agents.reduce((s, a) => s + (a.total_claims || 0), 0), icon: FileText },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm"
                    >
                        <s.icon className="h-4 w-4 text-gray-400 mb-2" />
                        <p className="text-2xl font-bold tabular-nums text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900">Ranking Agen</h2>
                    <p className="text-xs text-gray-400">{totalAgents} agen</p>
                </div>

                {sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Users className="h-8 w-8 text-gray-200" />
                        <p className="text-sm text-gray-400">Belum ada data agen</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Table Header */}
                        <div className="min-w-[800px] grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50/50 border-b border-gray-50 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">Agen</div>
                            <div
                                className="col-span-2 text-center cursor-pointer hover:text-gray-600 flex items-center justify-center gap-1"
                                onClick={() => toggleSort("total_points")}
                            >
                                Poin <SortIcon k="total_points" />
                            </div>
                            <div className="col-span-2 text-center">Rank</div>
                            <div
                                className="col-span-2 text-center cursor-pointer hover:text-gray-600 flex items-center justify-center gap-1"
                                onClick={() => toggleSort("total_claims")}
                            >
                                Klaim <SortIcon k="total_claims" />
                            </div>
                            <div className="col-span-2 text-center">Multiplier</div>
                        </div>

                        {sorted.map((agent, i) => {
                            const isExpanded = expandedId === agent.user_id;
                            const rainLabel = agent.rank_label || "Bronze Agent";
                            return (
                                <div key={agent.user_id} className="min-w-[800px] border-b border-gray-50 last:border-0">
                                    <div
                                        className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                                        onClick={() => setExpandedId(isExpanded ? null : agent.user_id)}
                                    >
                                        {/* Rank Number */}
                                        <div className="col-span-1 flex items-center justify-center">
                                            {i < 3 ? (
                                                <div className={cn(
                                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                                                    i === 0 ? "bg-black text-white shadow-sm" :
                                                        i === 1 ? "bg-gray-800 text-gray-100" : "bg-gray-200 text-gray-800"
                                                )}>
                                                    {i + 1}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 font-medium">{i + 1}</span>
                                            )}
                                        </div>

                                        {/* Agent Name */}
                                        <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                                            <div className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                {agent.agent_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{agent.agent_name}</p>
                                                <p className="text-xs text-gray-400 truncate">{agent.email}</p>
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div className="col-span-2 flex items-center justify-center">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-gray-900 tabular-nums">{agent.total_points.toLocaleString("id-ID")}</p>
                                                {agent.referral_points > 0 && (
                                                    <p className="text-xs text-gray-400">+{agent.referral_points} ref</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rank */}
                                        <div className="col-span-2 flex items-center justify-center">
                                            <span className={cn(
                                                "text-xs font-semibold px-2.5 py-1 rounded-full",
                                                rankColors[rainLabel] || "bg-gray-100 text-gray-500"
                                            )}>
                                                {rainLabel}
                                            </span>
                                        </div>

                                        {/* Claims */}
                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-gray-900">{agent.total_claims}</p>
                                                <p className="text-xs text-gray-400">{agent.approved_claims} approved</p>
                                            </div>
                                        </div>

                                        {/* Commission Multiplier */}
                                        <div className="col-span-2 flex items-center justify-center">
                                            <div className="text-center">
                                                <p className="text-lg font-bold text-gray-900">{Number(agent.commission_multiplier || 1).toFixed(2)}×</p>
                                                {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-400 mx-auto mt-0.5" /> : <ChevronDown className="h-3 w-3 text-gray-400 mx-auto mt-0.5" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-5 pb-4 bg-gray-50/40 border-t border-gray-50"
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                                                <div>
                                                    <p className="text-xs text-gray-400">Total Klien</p>
                                                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                                                        <Users className="h-4 w-4 text-gray-400" />
                                                        {agent.total_clients}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Klaim Disetujui</p>
                                                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4 text-gray-600" />
                                                        {agent.approved_claims}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Klaim Ditolak</p>
                                                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                                                        <XCircle className="h-4 w-4 text-gray-400" />
                                                        {agent.rejected_claims}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Klaim Pending</p>
                                                    <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                                                        <Clock className="h-4 w-4 text-gray-400" />
                                                        {agent.pending_claims}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Total Nilai Disetujui</p>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(agent.total_approved_value || 0)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Kode Referral</p>
                                                    {agent.referral_code ? (
                                                        <button
                                                            className="flex items-center gap-1.5 text-sm font-mono font-bold text-gray-900 hover:text-gray-600"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigator.clipboard.writeText(agent.referral_code!);
                                                                toast({ title: "Kode disalin" });
                                                            }}
                                                        >
                                                            {agent.referral_code}
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">—</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Poin Referral</p>
                                                    <p className="text-sm font-bold text-gray-900">{(agent.referral_points || 0).toLocaleString("id-ID")}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
