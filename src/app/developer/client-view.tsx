"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  MoreHorizontal, Link2,
} from "lucide-react";
import { CriticalAlertsBanner } from "@/components/developer/critical-alerts-banner";

interface Analytics {
  platformTotals: {
    totalUsers: number;
    activeUsers: number;
    pendingUsers: number;
    activeAgents: number;
    totalAgents: number;
    hospitals: number;
    agencies: number;
    totalClaims: number;
    totalClients: number;
  };
  sparklines: {
    users: number[];
    agents: number[];
    agencies: number[];
    hospitals: number[];
  };
  wow: {
    current: number;
    previous: number;
  };
  recentUsers: Array<{
    user_id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    full_name: string | null;
  }>;
  approvalRate30d: {
    approved: number;
    rejected: number;
    pending: number;
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

export function DeveloperClientView({ initialData }: { initialData?: Analytics | null }) {
  const [data, setData] = useState<Analytics | null>(initialData ?? null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/analytics", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const totals = data?.platformTotals;

  // Funnel: shows the 4 key platform metrics as a visual comparison
  const funnelSteps = totals ? [
    { label: "Total Client",   value: totals.totalClients },
    { label: "Total Pengguna", value: totals.totalUsers },
    { label: "Agen Aktif",     value: totals.activeAgents },
    { label: "Total Klaim",    value: totals.totalClaims },
  ] : [];

  const funnelMax = funnelSteps[0]?.value || 1;

  // WoW diff (users)
  const wowDiff = data ? data.wow.current - data.wow.previous : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans">
      <CriticalAlertsBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 mt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-black text-black tracking-tight">Ringkasan</h1>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h2 className="text-xl font-medium text-gray-900">Metrik Platform</h2>
              <p className="text-xs text-gray-400 mt-0.5">Perbandingan visual 4 indikator utama</p>
            </div>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-[300px] flex items-end relative z-10 pb-4">
            {!totals ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">Memuat…</div>
            ) : (
              funnelSteps.map((step, idx) => {
                // Use minimum 35% so all bars are visually substantial
                const h = Math.max(35, Math.round((step.value / funnelMax) * 100));
                const nextH = idx < funnelSteps.length - 1
                  ? Math.max(35, Math.round((funnelSteps[idx + 1].value / funnelMax) * 100))
                  : undefined;
                const prev = idx === 0 ? step.value : funnelSteps[idx - 1].value;
                return (
                  <FunnelBar
                    key={step.label}
                    label={step.label}
                    value={fmt(step.value)}
                    height={h}
                    nextHeight={nextH}
                    isLast={idx === funnelSteps.length - 1}
                    dataValue={step.value}
                    prevValue={prev}
                    maxVal={funnelMax}
                  />
                );
              })
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-100/60 to-transparent z-0 pointer-events-none" />
        </div>

        {/* Total Pengguna Platform */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Total Pengguna Platform</h2>
            <div className="mt-6 mb-10">
              <p className="text-[4rem] leading-none font-normal tracking-tighter text-gray-900">
                {totals ? totals.totalUsers.toLocaleString("id-ID") : "—"}
              </p>
              {totals && (
                <p className="text-sm text-gray-400 mt-2">
                  {totals.activeUsers.toLocaleString("id-ID")} aktif · {totals.pendingUsers.toLocaleString("id-ID")} pending
                </p>
              )}
            </div>

            <div className="space-y-7">
              {(() => {
                const total = totals?.totalUsers || 1;
                return (
                  <>
                    <MiniBar
                      label={`Agen Aktif (${totals ? totals.activeAgents.toLocaleString("id-ID") : "—"})`}
                      color="bg-blue-600"
                      pct={totals ? Math.min((totals.activeAgents / total) * 100, 100) : 0}
                    />
                    <MiniBar
                      label={`Admin Rumah Sakit (${totals ? totals.hospitals.toLocaleString("id-ID") : "—"})`}
                      color="bg-slate-800"
                      pct={totals ? Math.min((totals.hospitals / total) * 100, 100) : 0}
                    />
                    <MiniBar
                      label={`Agensi (${totals ? totals.agencies.toLocaleString("id-ID") : "—"})`}
                      color="bg-slate-400"
                      pct={totals ? Math.min((totals.agencies / total) * 100, 100) : 0}
                    />
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Registrasi Pengguna (sparkline) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col border border-gray-100 min-h-[240px]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-medium text-gray-900">Registrasi</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Pengguna baru — 14 hari terakhir</p>
          <div className="flex-1 w-full -mx-2 mt-2">
            <Sparkline values={data?.sparklines?.users ?? []} />
          </div>
          {wowDiff !== null && (
            <p className="text-xs text-gray-400 mt-3">
              <span className={`font-bold ${wowDiff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {wowDiff >= 0 ? "+" : ""}{wowDiff}
              </span>{" "}pengguna baru minggu ini
            </p>
          )}
        </div>

        {/* Total Klaim */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100 min-h-[240px]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-900">Total Klaim</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-auto pt-8">
            <p className="text-5xl font-normal tracking-tighter text-gray-900">
              {totals ? fmt(totals.totalClaims) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-3">Total klaim di seluruh platform</p>
          </div>
        </div>

        {/* Pembaruan Terbaru */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100 min-h-[240px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-gray-900">Pembaruan Terbaru</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4 overflow-y-auto max-h-[140px] pr-2">
            {data?.recentUsers?.length ? (
              data.recentUsers.slice(0, 3).map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-blue-600" : i === 1 ? "bg-slate-600" : "bg-slate-300"}`} />
                  <p className="text-sm text-gray-600 truncate">
                    <strong className="text-black">{u.full_name || u.email.split("@")[0]}</strong> bergabung sebagai {u.role.replace(/_/g, " ")}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400">Memuat…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-Components ─────────────────────────────────────────────── */

function FunnelBar({ label, value, height, nextHeight, isLast, dataValue, prevValue, maxVal }: {
  label: string; value: string; height: number; nextHeight?: number;
  isLast?: boolean; dataValue: number; prevValue: number; maxVal: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const safeNext = nextHeight ?? 0;
  const highest = Math.max(height, safeNext);
  const leftTop  = height  >= safeNext ? 0 : ((safeNext - height)  / safeNext)  * 100;
  const rightTop = safeNext >= height  ? 0 : ((height  - safeNext) / height)    * 100;

  void maxVal; void prevValue; void dataValue;

  return (
    <div
      className="flex-1 flex flex-col h-full group border-r border-gray-100 last:border-r-0 relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-[70px] flex flex-col justify-start px-1 z-20">
        <p className="text-[11px] sm:text-[13px] text-gray-500 font-medium mb-1 truncate">{label}</p>
        <p className={`text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight transition-colors duration-300 ${isHovered ? "text-gray-900" : "text-gray-500"}`}>
          {value}
        </p>
      </div>

      <div className="flex-1 flex items-end relative z-10 w-full mt-4">
        <div className="flex-1 flex flex-col justify-end items-center relative h-full">
          <div
            className="w-full relative transition-all duration-300"
            style={{
              height: `${height}%`,
              backgroundColor: isHovered ? "#1d4ed8" : "#2563eb",
              borderTop: "1px solid rgba(255,255,255,0.2)",
            }}
          />
          {isHovered && (
            <div className="absolute bottom-0 left-0 w-full h-[300px] bg-blue-50 -z-10 pointer-events-none" />
          )}
        </div>

        {!isLast && (
          <div className="w-[15%] sm:w-[20%] flex flex-col justify-end h-full">
            <div
              className="w-full relative transition-all duration-300"
              style={{
                height: `${highest}%`,
                background: isHovered ? "#3b82f6" : "#60a5fa",
                clipPath: `polygon(0 ${leftTop}%, 100% ${rightTop}%, 100% 100%, 0 100%)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MiniBar({ label, color, pct, striped }: { label: string; color: string; pct: number; striped?: boolean }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-gray-500 mb-2">{label}</p>
      <div className="h-3.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${pct}%`,
            backgroundImage: striped
              ? "linear-gradient(45deg, rgba(255,255,255,0.3) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.3) 75%, transparent 75%, transparent)"
              : "none",
            backgroundSize: "8px 8px",
          }}
        />
      </div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <div className="h-full w-full rounded-2xl bg-gray-50" />;
  }

  const width = 320;
  const height = 120;
  const padding = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x = values.length === 1
      ? width / 2
      : padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${points[0].x.toFixed(2)} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="registration-sparkline-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#registration-sparkline-fill)" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
