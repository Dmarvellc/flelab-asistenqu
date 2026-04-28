"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AgencyAgent } from "@/services/admin-agency";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  X, Check, ArrowRight, User, CheckCircle2, Loader2,
  Mail, Phone, FileText, Shield, Download, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function relDate(iso: string) {
  if (!iso) return "—";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d >= 365) return `${Math.floor(d / 365)} thn lalu`;
  if (d >= 30)  return `${Math.floor(d / 30)} bln lalu`;
  if (d > 0)    return `${d} hari lalu`;
  return "Hari ini";
}

const STATUS_CFG: Record<string, { dot: string; label: string; text: string; bg: string; ring: string }> = {
  ACTIVE:    { dot: "bg-emerald-500", label: "Aktif",    text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200" },
  PENDING:   { dot: "bg-amber-400",   label: "Pending",  text: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200"   },
  SUSPENDED: { dot: "bg-rose-500",    label: "Nonaktif", text: "text-rose-700",    bg: "bg-rose-50",    ring: "ring-rose-200"    },
  INVITED:   { dot: "bg-blue-400",    label: "Diundang", text: "text-blue-700",    bg: "bg-blue-50",    ring: "ring-blue-200"    },
};
const FALLBACK_S = { dot: "bg-gray-300", label: "—", text: "text-gray-500", bg: "bg-gray-50", ring: "ring-gray-100" };

type SortKey = "full_name" | "joined_at" | "total_policies" | "total_claims";
type SortDir = "asc" | "desc";

interface Props { agents: AgencyAgent[] }

export function AgentsDataTable({ agents: raw }: Props) {
  const router = useRouter();
  const [search,      setSearch]      = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [filterStatus,setFilterStatus]= useState<string | null>(null);
  const [sort,        setSort]        = useState<{ key: SortKey; dir: SortDir }>({ key: "joined_at", dir: "desc" });
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [approving,   setApproving]   = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const a of raw) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [raw]);

  const rows = useMemo(() => {
    let r = [...raw];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(a =>
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.phone_number || "").includes(q)
      );
    }
    if (filterStatus) r = r.filter(a => a.status === filterStatus);
    r.sort((a, b) => {
      const [av, bv] =
        sort.key === "full_name"      ? [a.full_name, b.full_name] :
        sort.key === "total_policies" ? [a.total_policies, b.total_policies] :
        sort.key === "total_claims"   ? [a.total_claims, b.total_claims] :
        [new Date(a.joined_at || 0).getTime(), new Date(b.joined_at || 0).getTime()];
      if (typeof av === "number" && typeof bv === "number")
        return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return r;
  }, [raw, search, filterStatus, sort]);

  const cycleSort = (key: SortKey) =>
    setSort(p => ({ key, dir: p.key === key ? (p.dir === "asc" ? "desc" : "asc") : "desc" }));

  const allSel  = rows.length > 0 && rows.every(a => selected.has(a.user_id));
  const someSel = selected.size > 0;
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map(a => a.user_id)));
  const toggleRow = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleApprove = async (agentId: string) => {
    setApproving(agentId);
    try {
      const res = await fetch(`/api/admin-agency/agents/${agentId}/approve`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Berhasil", description: "Agen telah disetujui." });
        router.refresh();
      } else {
        toast({ title: "Gagal", description: "Gagal menyetujui agen.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Terjadi kesalahan sistem.", variant: "destructive" });
    } finally {
      setApproving(null);
    }
  };

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

  const filterStatuses = Object.keys(statusCounts);

  return (
    <div className="flex flex-col">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-50">
        {someSel ? (
          <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{selected.size} dipilih</span>
            <div className="w-px h-4 bg-gray-200" />
            <button className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </button>
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
            <p className="text-sm font-bold text-gray-900">Direktori Agen</p>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 tabular-nums">
              {raw.length}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 h-8 rounded-xl border bg-white transition-all duration-250 overflow-hidden",
            searchOpen ? "w-48 border-gray-300 px-3 shadow-sm" : "w-8 border-transparent justify-center hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
          )}>
            <button onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 60); }} className="shrink-0 flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {searchOpen && (
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari agen…"
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

      {/* ── Status chips ── */}
      {filterStatuses.length > 1 && (
        <div className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 border-b border-gray-50 overflow-x-auto">
          <button onClick={() => setFilterStatus(null)}
            className={cn("flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
              !filterStatus ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            Semua
            <span className={cn("inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold tabular-nums",
              !filterStatus ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600")}>{raw.length}</span>
          </button>
          {filterStatuses.map(st => {
            const cfg = STATUS_CFG[st] || FALLBACK_S;
            const active = filterStatus === st;
            return (
              <button key={st} onClick={() => setFilterStatus(p => p === st ? null : st)}
                className={cn("flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
                  active ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}` : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                {cfg.label}
                <span className={cn("inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold tabular-nums",
                  active ? "bg-white/50" : "bg-gray-200 text-gray-500")}>{statusCounts[st]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/40">
              <th className="w-10 pl-5 sm:pl-6 pr-3 py-2.5">
                <Checkbox checked={allSel} indeterminate={someSel && !allSel} onClick={toggleAll} />
              </th>
              {([
                { key: "full_name" as SortKey,      label: "Agen",       sortable: true  },
                { key: null,                         label: "Kontak",     sortable: false },
                { key: null,                         label: "Status",     sortable: false },
                { key: "joined_at" as SortKey,       label: "Bergabung",  sortable: true  },
                { key: "total_policies" as SortKey,  label: "Polis",      sortable: true  },
                { key: "total_claims" as SortKey,    label: "Klaim",      sortable: true  },
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
              <th className="py-2.5 pr-5 sm:pr-6 w-24" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-200" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">
                    {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada agen"}
                  </p>
                  {(search || filterStatus) && (
                    <button onClick={() => { setSearch(""); setSearchOpen(false); setFilterStatus(null); }}
                      className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition-colors">
                      Hapus filter
                    </button>
                  )}
                </div>
              </td></tr>
            ) : (
              rows.map((agent, idx) => {
                const cfg   = STATUS_CFG[agent.status] || FALLBACK_S;
                const isSel = selected.has(agent.user_id);
                return (
                  <tr key={agent.user_id}
                    className={cn("group/row border-b border-gray-50 last:border-0 transition-colors duration-100",
                      isSel ? "bg-blue-50/30" : "hover:bg-gray-50/70")}
                    style={{ animationDelay: `${idx * 25}ms` }}>

                    <td className="pl-5 sm:pl-6 pr-3 py-3.5">
                      <Checkbox checked={isSel} onClick={() => toggleRow(agent.user_id)} invisible />
                    </td>

                    {/* Name + email */}
                    <td className="py-3.5 pr-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[170px] leading-tight">{agent.full_name}</p>
                        <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate max-w-[170px]">
                          <Mail className="w-2.5 h-2.5 shrink-0" />{agent.email}
                        </p>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 pr-4">
                      <span className="text-[13px] text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-300 shrink-0" />
                        {agent.phone_number || <span className="text-gray-200">—</span>}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 pr-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 whitespace-nowrap",
                        cfg.bg, cfg.text, cfg.ring)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="py-3.5 pr-4">
                      <span title={agent.joined_at ? new Date(agent.joined_at).toLocaleDateString("id-ID", { dateStyle: "long" }) : ""}
                        className="text-[13px] text-gray-500 cursor-default">{relDate(agent.joined_at)}</span>
                    </td>

                    {/* Policies */}
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-900 tabular-nums">
                        <Shield className="w-3 h-3 text-gray-300" />{agent.total_policies}
                      </span>
                    </td>

                    {/* Claims */}
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-900 tabular-nums">
                        <FileText className="w-3 h-3 text-gray-300" />{agent.total_claims}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 pr-5 sm:pr-6">
                      {agent.status === "PENDING" ? (
                        <button
                          onClick={() => handleApprove(agent.user_id)}
                          disabled={approving === agent.user_id}
                          className="opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-gray-900 hover:bg-black rounded-lg px-2.5 py-1 shadow-sm whitespace-nowrap disabled:opacity-60"
                        >
                          {approving === agent.user_id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle2 className="w-3 h-3" />}
                          Setujui
                        </button>
                      ) : (
                        <span className="opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1 hover:shadow-sm whitespace-nowrap cursor-default">
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-gray-50 bg-gray-50/30">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600 tabular-nums">{rows.length}</span> dari{" "}
          <span className="font-semibold text-gray-600 tabular-nums">{raw.length}</span> agen
          {filterStatus && <span className="ml-1">· filter: <span className="font-medium">{STATUS_CFG[filterStatus]?.label}</span></span>}
        </p>
      </div>
    </div>
  );
}
