"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, ResponsiveContainer
} from "recharts";
import {
  Calendar, MoreHorizontal, Link2,
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

  // Funnel steps — derived from live data
  const funnelSteps = totals ? [
    { label: "Total Pengguna", value: totals.totalUsers },
    { label: "Pengguna Aktif", value: totals.activeUsers },
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
          <h1 className="text-4xl font-normal text-gray-900 tracking-tight">Overview</h1>
          <button className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors">
            <Link2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4 text-gray-400" />
            This Month
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <h2 className="text-xl font-medium text-gray-900">User Conversion</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 min-h-[300px] flex items-end relative z-10 pb-4">
            {!totals ? (
              <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">Memuat…</div>
            ) : (
              funnelSteps.map((step, idx) => {
                const h = Math.max(10, Math.round((step.value / funnelMax) * 100));
                const nextH = idx < funnelSteps.length - 1
                  ? Math.max(10, Math.round((funnelSteps[idx + 1].value / funnelMax) * 100))
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

        {/* Total Platform Users */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Total Platform Users</h2>
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
                      color="bg-emerald-500"
                      pct={totals ? Math.min((totals.activeAgents / total) * 100, 100) : 0}
                      striped
                    />
                    <MiniBar
                      label={`Hospital Admins (${totals ? totals.hospitals.toLocaleString("id-ID") : "—"})`}
                      color="bg-blue-500"
                      pct={totals ? Math.min((totals.hospitals / total) * 100, 100) : 0}
                      striped
                    />
                    <MiniBar
                      label={`Agensi (${totals ? totals.agencies.toLocaleString("id-ID") : "—"})`}
                      color="bg-pink-400"
                      pct={totals ? Math.min((totals.agencies / total) * 100, 100) : 0}
                      striped
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(data?.sparklines?.users ?? []).map(v => ({ v }))}>
                <Line type="stepAfter" dataKey="v" stroke="#f472b6" strokeWidth={3} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Klaim */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100 min-h-[240px]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium text-gray-900">Total Klaim</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-end justify-between mt-auto pt-8">
            <div>
              <p className="text-5xl font-normal tracking-tighter text-gray-900">
                {totals ? fmt(totals.totalClaims) : "—"}
              </p>
            </div>

            {/* Dot chart — user sparkline last 7 days */}
            <div className="flex flex-col items-center gap-1.5 pb-1 relative">
              <div className="flex items-end gap-1.5 h-12">
                {(() => {
                  const spark = data?.sparklines?.users?.slice(-7) ?? [];
                  const max = Math.max(...spark, 1);
                  return spark.map((val, i) => (
                    <DotColumn key={i} count={Math.max(1, Math.ceil((val / max) * 5))} active={i === spark.length - 1} />
                  ));
                })()}
              </div>
            </div>

            <div className="text-right pb-1">
              <p className="text-xs text-gray-400 mb-1">pengguna baru 7 hari</p>
              <p className="text-sm font-bold text-gray-900">
                {wowDiff !== null
                  ? `${wowDiff >= 0 ? "+" : ""}${wowDiff}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between border border-gray-100 min-h-[240px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-gray-900">Recent Updates</h2>
            <button className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-4 overflow-y-auto max-h-[140px] pr-2">
            {data?.recentUsers?.length ? (
              data.recentUsers.slice(0, 3).map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-blue-500" : i === 1 ? "bg-emerald-500" : "bg-pink-400"}`} />
                  <p className="text-sm text-gray-600 truncate">
                    <strong>{u.full_name || u.email.split("@")[0]}</strong> bergabung sebagai {u.role}
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

  void maxVal; void prevValue; void dataValue; // available for tooltip use

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
              backgroundImage: isHovered
                ? "linear-gradient(to bottom, #3b82f6, #2563eb)"
                : "repeating-linear-gradient(45deg, rgba(255,255,255,0.9) 0, rgba(255,255,255,0.9) 6px, transparent 6px, transparent 12px), linear-gradient(to bottom, #60a5fa, #eff6ff)",
              boxShadow: isHovered ? "0 0 30px rgba(37,99,235,0.3)" : "none",
              borderTop: isHovered ? "1px solid #60a5fa" : "1px solid rgba(255,255,255,1)",
            }}
          />
          {isHovered && (
            <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-t from-transparent via-blue-100/30 to-blue-200/50 -z-10 pointer-events-none" />
          )}
        </div>

        {!isLast && (
          <div className="w-[15%] sm:w-[20%] flex flex-col justify-end h-full">
            <div
              className="w-full relative transition-all duration-300"
              style={{
                height: `${highest}%`,
                background: isHovered
                  ? "linear-gradient(to bottom, #2563eb, rgba(37,99,235,0.1))"
                  : "linear-gradient(to bottom, #93c5fd, rgba(147,197,253,0.1))",
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

function DotColumn({ count, active }: { count: number; active?: boolean }) {
  return (
    <div className="flex flex-col gap-[3px] justify-end h-full">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-[10px] h-[10px] rounded-[3px] transition-colors ${
            i >= 5 - count ? (active ? "bg-emerald-500" : "bg-emerald-300") : "bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
