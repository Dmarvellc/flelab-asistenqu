
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

const data = [
    { name: "Jan", claims: 4, points: 450 },
    { name: "Feb", claims: 7, points: 800 },
    { name: "Mar", claims: 5, points: 600 },
    { name: "Apr", claims: 12, points: 1500 },
    { name: "May", claims: 9, points: 1100 },
    { name: "Jun", claims: 15, points: 2000 },
    { name: "Jul", claims: 18, points: 2400 },
]

export function PerformanceChart() {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                    dataKey="name"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                />
                <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${value}`}
                />
                <Tooltip
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="points" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Points Earned" />
                <Bar dataKey="claims" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Claims Processed" />
            </BarChart>
        </ResponsiveContainer>
    )
}
