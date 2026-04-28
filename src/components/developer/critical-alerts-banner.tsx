"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, CheckCircle2, RefreshCw, X } from "lucide-react";

interface CriticalAlert {
  logId: string;
  level: "info" | "warn" | "error" | "critical";
  scope: string;
  message: string;
  occurrences: number;
  firstSeenAt: string;
  lastSeenAt: string;
  requestPath: string | null;
}

function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

/**
 * Red banner that surfaces unacknowledged public-facing critical errors.
 * Polls /api/developer/alerts?mode=critical every 30s so a new outage is
 * visible in the Developer Console before users notice it.
 */
export function CriticalAlertsBanner() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/alerts?mode=critical&limit=5", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setAlerts(Array.isArray(json.alerts) ? json.alerts : []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const ackOne = async (logId: string) => {
    setBusy(true);
    try {
      await fetch("/api/developer/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ack", logId }),
      });
      setAlerts((prev) => prev.filter((a) => a.logId !== logId));
    } finally {
      setBusy(false);
    }
  };

  const ackAll = async () => {
    setBusy(true);
    try {
      await fetch("/api/developer/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ack-all" }),
      });
      setAlerts([]);
    } finally {
      setBusy(false);
    }
  };

  if (alerts.length === 0) return null;

  const critCount = alerts.filter((a) => a.level === "critical").length;
  const tone = critCount > 0
    ? "bg-red-50 border-red-200"
    : "bg-amber-50 border-amber-200";
  const accent = critCount > 0 ? "text-red-700" : "text-amber-700";
  const dot = critCount > 0 ? "bg-red-500" : "bg-amber-500";

  return (
    <div className={`rounded-2xl border ${tone} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-60 animate-ping`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
          </span>
          <AlertOctagon className={`h-4 w-4 ${accent}`} />
          <h3 className={`text-sm font-bold ${accent}`}>
            {critCount > 0 ? "Critical alerts pada sistem publik" : "Peringatan error sistem publik"}
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border ${critCount > 0 ? "border-red-200 text-red-700" : "border-amber-200 text-amber-700"}`}>
            {alerts.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchAlerts}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={ackAll}
            disabled={busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Ack semua
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-white/60 transition-colors"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </div>

      {/* Alert list */}
      {!collapsed && (
        <div className="divide-y divide-black/5">
          {alerts.map((a) => (
            <div key={a.logId} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-1 inline-flex w-1.5 h-1.5 rounded-full shrink-0 ${
                  a.level === "critical" ? "bg-red-500" : "bg-amber-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-900 truncate max-w-[32ch]">
                    {a.scope}
                  </span>
                  {a.occurrences > 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-black/10 text-gray-600">
                      ×{a.occurrences}
                    </span>
                  )}
                  {a.requestPath && (
                    <span className="text-[10px] text-gray-400 truncate">
                      {a.requestPath}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-gray-400 tabular-nums">
                    {fmtAgo(a.lastSeenAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-gray-700 leading-snug line-clamp-2">
                  {a.message}
                </p>
              </div>
              <button
                onClick={() => ackOne(a.logId)}
                disabled={busy}
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-gray-900 hover:bg-white/80 transition-colors"
                title="Acknowledge"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
