"use client"

import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#ef4444", // Red
  admin_agency: "#f97316", // Orange
  insurance_admin: "#eab308", // Yellow
  hospital_admin: "#84cc16", // Lime
  agent_manager: "#06b6d4", // Cyan
  agent: "#3b82f6", // Blue
  developer: "#8b5cf6", // Violet
  hospital: "#10b981", // Emerald
}

const DEFAULT_COLOR = "#64748b" // Slate

export function UserRoleChart({ data }: { data: Record<string, number> }) {
  // Convert object to array for Recharts
  const chartData = Object.entries(data).map(([role, count]) => ({
    name: role.replace('_', ' '), // Format role name
    count,
    fill: ROLE_COLORS[role] || DEFAULT_COLOR,
  }));

  if (chartData.length === 0) {
      return <div className="text-center text-muted-foreground py-8">No data available</div>
  }

  return (
    <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={true}
            >
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
            </Pie>
            <Tooltip 
                formatter={(value: number) => [value, "Users"]}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
    </div>
  )
}
