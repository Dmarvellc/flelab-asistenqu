"use client"

import * as React from "react"
import {
  CartesianGrid, Line, LineChart, XAxis, YAxis, Area, AreaChart,
  Bar, BarChart, Cell, LabelList, Pie, PieChart, Label,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, Tooltip
} from "recharts"
import { TrendingUp, FileText, Activity } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

/* ─── COLOR PALETTE (Asistenqu Blue) ─── */
const COLORS = [
  "#1d4ed8", // blue-700
  "#2563eb", // blue-600
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#93c5fd", // blue-300
]

/* -------------------------------------------------------------------------- */
/* 1. CHART LINE (Pendaftaran Harian)                                         */
/* -------------------------------------------------------------------------- */
export function ChartDailyRegistrations({ data }: { data?: { date: string; count: number }[] }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Tidak ada data</Card>

  const config = { count: { label: "Pendaftar Baru", color: COLORS[0] } } satisfies ChartConfig

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle>Pendaftaran Harian</CardTitle>
        <CardDescription>Total pengguna baru per hari (30 hari terakhir)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
            />
            <ChartTooltip content={<ChartTooltipContent className="bg-white border-gray-200 shadow-sm" />} />
            <Line
              dataKey="count"
              type="monotone"
              stroke="var(--color-count)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: COLORS[0], stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 2. CHART AREA (Pendaftaran Bulanan)                                        */
/* -------------------------------------------------------------------------- */
export function ChartMonthlyArea({ data }: { data?: { month: string; count: number }[] }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Tidak ada data</Card>

  const config = { count: { label: "Total Registrasi", color: COLORS[1] } } satisfies ChartConfig

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle>Tren Bulanan</CardTitle>
        <CardDescription>Volume pendaftaran pengguna per bulan</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <defs>
              <linearGradient id="fillArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => {
                const [y, m] = value.split("-")
                const date = new Date(Number(y), Number(m) - 1, 1)
                return date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
              }}
            />
            <ChartTooltip content={<ChartTooltipContent className="bg-white border-gray-200 shadow-sm" />} />
            <Area dataKey="count" type="monotone" fill="url(#fillArea)" stroke="var(--color-count)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 3. CHART PIE DONUT (Status Klaim)                                           */
/* -------------------------------------------------------------------------- */
export function ChartClaimsDonut({ data }: { data?: { stage: string; count: number }[] }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Tidak ada data</Card>

  const formattedData = data.map((d, i) => ({
    ...d,
    fill: COLORS[i % COLORS.length]
  }))

  const total = data.reduce((acc, curr) => acc + curr.count, 0)

  const config = data.reduce((acc, d, i) => {
    acc[d.stage] = { label: d.stage.replace(/_/g, " "), color: COLORS[i % COLORS.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>) satisfies ChartConfig

  return (
    <Card className="flex flex-col shadow-sm border-gray-200">
      <CardHeader className="items-center pb-0">
        <CardTitle>Distribusi Status Klaim</CardTitle>
        <CardDescription>Berdasarkan tahapan klaim saat ini</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="bg-white border-gray-200 shadow-sm" />} />
            <Pie data={formattedData} dataKey="count" nameKey="stage" innerRadius={60} strokeWidth={4} stroke="#fff">
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-slate-900 text-3xl font-black">
                          {total}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-slate-500 text-[10px] uppercase tracking-widest font-bold">
                          Total Klaim
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 4. CHART AREA (Total Akumulasi Pengguna / Total Client)                     */
/* -------------------------------------------------------------------------- */
export function ChartCumulativeGrowth({ daily, totalNow }: { daily?: { date: string; count: number }[], totalNow?: number }) {
  if (!daily || daily.length === 0 || totalNow === undefined) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Tidak ada data</Card>

  // Work backwards to calculate cumulative total
  let current = totalNow
  const data = [...daily].reverse().map(d => {
    const pt = { date: d.date, total: current }
    current -= d.count
    return pt
  }).reverse()

  const config = { total: { label: "Total Pengguna", color: COLORS[0] } } satisfies ChartConfig

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle>Total Pengguna (Akumulasi)</CardTitle>
        <CardDescription>Pertumbuhan total client platform</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
            />
            <ChartTooltip content={<ChartTooltipContent className="bg-white border-gray-200 shadow-sm" />} />
            <Area dataKey="total" type="monotone" fill="url(#fillTotal)" stroke="var(--color-total)" strokeWidth={3} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 5. CHART BAR (Delta Pendaftaran Harian)                                     */
/* -------------------------------------------------------------------------- */
export function ChartDailyDelta({ data }: { data?: { date: string; count: number }[] }) {
  if (!data || data.length === 0) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Tidak ada data</Card>

  const config = { count: { label: "Delta Baru", color: COLORS[1] } } satisfies ChartConfig

  return (
    <Card className="shadow-sm border-gray-200 flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>Delta Client Per Hari</CardTitle>
        <CardDescription>Fluktuasi pendaftaran harian (30 hari)</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 mt-4">
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <BarChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent className="bg-white border-gray-200 shadow-sm" />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} barSize={16} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* 6. CHART BAR NEGATIVE (Delta Pertumbuhan Bulanan)                           */
/* -------------------------------------------------------------------------- */
export function ChartMonthlyDelta({ data }: { data?: { month: string; count: number }[] }) {
  if (!data || data.length < 2) return <Card className="p-6 text-center text-gray-500 text-sm h-[300px] flex items-center justify-center">Data tidak cukup untuk delta</Card>

  // Calculate delta from previous month
  const deltaData = []
  for (let i = 1; i < data.length; i++) {
    deltaData.push({
      month: data[i].month,
      delta: data[i].count - data[i-1].count
    })
  }

  const config = { delta: { label: "Net Delta" } } satisfies ChartConfig

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle>Net Delta Pendaftaran</CardTitle>
        <CardDescription>Selisih pendaftaran dari bulan sebelumnya</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[250px] w-full">
          <BarChart accessibilityLayer data={deltaData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel hideIndicator className="bg-white border-gray-200 shadow-sm rounded-lg" />} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => {
                const [y, m] = value.split("-")
                const date = new Date(Number(y), Number(m) - 1, 1)
                return date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
              }}
            />
            <Bar dataKey="delta" radius={4} barSize={32}>
              {deltaData.map((item) => (
                <Cell key={item.month} fill={item.delta >= 0 ? COLORS[0] : COLORS[3]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
