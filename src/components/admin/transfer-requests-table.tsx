"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Search, X, Check, ArrowRight, ArrowRightLeft,
  CheckCircle2, XCircle, Loader2, Download, Trash2,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────── */
interface TransferRequest {
  request_id: string;
  agent_id: string;
  agent_name: string;
  from_agency_name?: string;
  to_agency_name: string;
  status: string;
  request_reason: string;
  requested_at: string;
}

/* ─── Shared utils ──────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700", "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
  "bg-pink-100 text-pink-700", "bg-indigo-100 text-indigo-700",
];
const avatarColor = (s: string) => AVATAR_COLORS[(s.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (d >= 30)  return `${Math.floor(d / 30)} bln lalu`;
  if (d > 0)    return `${d}h lalu`;
  if (h > 0)    return `${h}j lalu`;
  if (m > 0)    return `${m}m lalu`;
  return "Baru saja";
}

type SortKey = "agent_name" | "requested_at" | "from_agency_name";
type SortDir = "asc" | "desc";

/* ─── Component ─────────────────────────────────────────────────── */
export function TransferRequestsTable() {
  const [requests,     setRequests]     = useState<TransferRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [sort,         setSort]         = useState<{ key: SortKey; dir: SortDir }>({ key: "requested_at", dir: "desc" });
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin-agency/transfers");
      if (res.ok) setRequests(await res.json());
    } catch {
      toast({ title: "Error", description: "Gagal memuat data transfer.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (requestId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/admin-agency/transfers/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast({ title: "Berhasil", description: action === "APPROVE" ? "Transfer disetujui." : "Transfer ditolak." });
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Gagal memproses permintaan.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const rows = useMemo(() => {
    let r = [...requests];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(req =>
        req.agent_name.toLowerCase().includes(q) ||
        (req.from_agency_name || "").toLowerCase().includes(q) ||
        req.to_agency_name.toLowerCase().includes(q) ||
        req.request_reason.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      const [av, bv] =
        sort.key === "agent_name"       ? [a.agent_name, b.agent_name] :
        sort.key === "from_agency_name" ? [a.from_agency_name || "", b.from_agency_name || ""] :
        [new Date(a.requested_at).getTime(), new Date(b.requested_at).getTime()];
      if (typeof av === "number" && typeof bv === "number")
        return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return r;
  }, [requests, search, sort]);

  const cycleSort = (key: SortKey) =>
    setSort(p => ({ key, dir: p.key === key ? (p.dir === "asc" ? "desc" : "asc") : "desc" }));

  const allSel  = rows.length > 0 && rows.every(r => selected.has(r.request_id));
  const someSel = selected.size > 0;
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map(r => r.request_id)));
  const toggleRow = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sort.key !== col
      ? <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover/th:text-gray-400 transition-colors" />
      : sort.dir === "asc"
        ? <ChevronUp   className="w-3 h-3 text-gray-800" />
        : <ChevronDown className="w-3 h-3 text-gray-800" />;

  const Checkbox = ({ checked, indeterminate, onClick, invisible }: {
    checked: boolean; indeterminate?: boolean; onClick: () => void; invisible?: boolean;
  }) => (
    <button onClick={onClick} className={cn(
      "w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center transition-all duration-150 shrink-0",
      checked       ? "bg-gray-900 border-gray-900 shadow-sm" :
      indeterminate ? "bg-gray-200 border-gray-300" :
                      "border-gray-300 hover:border-gray-500 bg-white",
      invisible && !someSel && "opacity-0 group-hover/row:opacity-100"
    )}>
      {checked       && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
      {indeterminate && !checked && <div className="w-2 h-[1.5px] bg-gray-600 rounded-full" />}
    </button>
  );

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 bg-gray-100 rounded-md animate-pulse" />
            <div className="h-5 w-6 bg-gray-100 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-8 rounded-xl bg-gray-100 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 sm:px-6 py-4">
              <div className="w-4 h-4 rounded-[3px] bg-gray-100 animate-pulse shrink-0" />
              <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />
              <div className="flex gap-2">
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
                <div className="h-7 w-16 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-50">
        {someSel ? (
          <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{selected.size} dipilih</span>
            <div className="w-px h-4 bg-gray-200" />
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
              <Download className="w-3.5 h-3.5" /> Ekspor
            </button>
            <button onClick={() => setSelected(new Set())}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">Permintaan Transfer</p>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 tabular-nums">
              {requests.length}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 h-8 rounded-xl border bg-white transition-all duration-250 overflow-hidden",
            searchOpen ? "w-48 border-gray-300 px-3 shadow-sm" : "w-8 border-transparent justify-center hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
          )}>
            <button onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 60); }}
              className="shrink-0 flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {searchOpen && (
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
                onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }}
              />
            )}
            {searchOpen && search && (
              <button onClick={() => setSearch("")}><X className="w-3 h-3 text-gray-400 hover:text-gray-700 transition-colors" /></button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className="w-10 pl-5 sm:pl-6 pr-3 py-2.5">
                <Checkbox checked={allSel} indeterminate={someSel && !allSel} onClick={toggleAll} />
              </th>
              {([
                { key: "agent_name" as SortKey,       label: "Agen",     sortable: true  },
                { key: "from_agency_name" as SortKey,  label: "Rute",     sortable: false },
                { key: null,                           label: "Alasan",   sortable: false },
                { key: "requested_at" as SortKey,      label: "Tanggal",  sortable: true  },
              ] as Array<{ key: SortKey | null; label: string; sortable: boolean }>).map((h, i) => (
                <th key={i} className="py-2.5 pr-4 text-left">
                  {h.sortable && h.key ? (
                    <button onClick={() => cycleSort(h.key!)}
                      className={cn("group/th flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        sort.key === h.key ? "text-gray-800" : "text-gray-400 hover:text-gray-600")}>
                      {h.label}<SortIcon col={h.key} />
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h.label}</span>
                  )}
                </th>
              ))}
              <th className="py-2.5 pr-5 sm:pr-6 w-32 text-right">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-gray-200" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">
                    {search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada permintaan transfer"}
                  </p>
                  {search && (
                    <button onClick={() => { setSearch(""); setSearchOpen(false); }}
                      className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors">
                      Hapus filter
                    </button>
                  )}
                </div>
              </td></tr>
            ) : (
              rows.map((req, idx) => {
                const isSel    = selected.has(req.request_id);
                const color    = avatarColor(req.agent_name);
                const isProcss = processingId === req.request_id;
                return (
                  <tr key={req.request_id}
                    className={cn("group/row border-b border-gray-50 last:border-0 transition-colors duration-100",
                      isSel ? "bg-blue-50/30" : "hover:bg-gray-50/70")}
                    style={{ animationDelay: `${idx * 25}ms` }}>

                    <td className="pl-5 sm:pl-6 pr-3 py-3.5">
                      <Checkbox checked={isSel} onClick={() => toggleRow(req.request_id)} invisible />
                    </td>

                    {/* Agent */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0", color)}>
                          {req.agent_name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[130px]">{req.agent_name}</p>
                      </div>
                    </td>

                    {/* Route: From → To */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <span className="text-gray-400 truncate max-w-[90px]" title={req.from_agency_name || "—"}>
                          {req.from_agency_name || <span className="italic">—</span>}
                        </span>
                        <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                        <span className="font-semibold text-gray-700 truncate max-w-[90px]" title={req.to_agency_name}>
                          {req.to_agency_name}
                        </span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 pr-4 max-w-[180px]">
                      <p className="text-[12px] text-gray-500 truncate" title={req.request_reason}>
                        {req.request_reason || <span className="text-gray-200 italic">—</span>}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 pr-4">
                      <span
                        title={format(new Date(req.requested_at), "d MMM yyyy HH:mm", { locale: id })}
                        className="text-[13px] text-gray-500 cursor-default whitespace-nowrap"
                      >
                        {relDate(req.requested_at)}
                      </span>
                    </td>

                    {/* Actions — always visible, styled premium */}
                    <td className="py-3.5 pr-5 sm:pr-6">
                      <div className="flex items-center justify-end gap-2">
                        {isProcss ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses…
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleAction(req.request_id, "REJECT")}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg px-2.5 py-1 transition-all duration-150 whitespace-nowrap"
                            >
                              <XCircle className="w-3 h-3" /> Tolak
                            </button>
                            <button
                              onClick={() => handleAction(req.request_id, "APPROVE")}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg px-2.5 py-1 transition-all duration-150 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Setujui
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center px-5 sm:px-6 py-3.5 border-t border-gray-50 bg-gray-50/30">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600 tabular-nums">{rows.length}</span> dari{" "}
          <span className="font-semibold text-gray-600 tabular-nums">{requests.length}</span> permintaan menunggu keputusan
        </p>
      </div>
    </div>
  );
}
