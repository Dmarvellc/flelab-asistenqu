
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

import { AgentChartData } from "@/services/agent-metrics";

interface PerformanceChartProps {
    data: AgentChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 min-w-[120px]">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                            <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.fill }}
                            />
                            <span className="text-xs text-gray-500">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function PerformanceChart({ data }: PerformanceChartProps) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                    dataKey="name"
                    stroke="#d1d5db"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                    tick={{ fill: '#9ca3af', fontWeight: 500 }}
                />
                <YAxis
                    stroke="#d1d5db"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb', radius: 6 }} />
                <Bar dataKey="clients" fill="#111827" radius={[4, 4, 0, 0]} name="Klien Baru" />
                <Bar dataKey="claims" fill="#d1d5db" radius={[4, 4, 0, 0]} name="Klaim" />
            </BarChart>
        </ResponsiveContainer>
    )
}
