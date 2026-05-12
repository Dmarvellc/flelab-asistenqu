"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Claim } from "@/lib/claims-data";
import {
  Search, SlidersHorizontal, ChevronUp, ChevronDown,
  ArrowRight, FileText, Trash2, Download, Check,
  ChevronsUpDown, X, Eye, MoreHorizontal, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ─── Status config ─────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { dot: string; label: string; text: string; bg: string; ring: string }> = {
  SUBMITTED_TO_AGENCY: { dot: "bg-amber-400",  label: "Diajukan",     text: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200"  },
  SUBMITTED:           { dot: "bg-amber-400",  label: "Diajukan",     text: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-200"  },
  APPROVED:            { dot: "bg-emerald-500",label: "Disetujui",    text: "text-emerald-700",bg: "bg-emerald-50",ring: "ring-emerald-200" },
  PAID:                { dot: "bg-teal-500",   label: "Dibayar",      text: "text-teal-700",   bg: "bg-teal-50",   ring: "ring-teal-200"   },
  REJECTED:            { dot: "bg-rose-500",   label: "Ditolak",      text: "text-rose-700",   bg: "bg-rose-50",   ring: "ring-rose-200"   },
  Declined:            { dot: "bg-rose-500",   label: "Ditolak",      text: "text-rose-700",   bg: "bg-rose-50",   ring: "ring-rose-200"   },
  INFO_REQUESTED:      { dot: "bg-blue-500",   label: "Perlu Info",   text: "text-blue-700",   bg: "bg-blue-50",   ring: "ring-blue-200"   },
  INFO_SUBMITTED:      { dot: "bg-violet-500", label: "Info Terkirim",text: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-200" },
  IN_PROGRESS:         { dot: "bg-orange-400", label: "Diproses",     text: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" },
  "On Progress":       { dot: "bg-orange-400", label: "Diproses",     text: "text-orange-700", bg: "bg-orange-50", ring: "ring-orange-200" },
  REVIEW:              { dot: "bg-indigo-500", label: "Review",       text: "text-indigo-700", bg: "bg-indigo-50", ring: "ring-indigo-200" },
  DRAFT:               { dot: "bg-gray-400",   label: "Draft",        text: "text-gray-600",   bg: "bg-gray-50",   ring: "ring-gray-200"   },
};
const FALLBACK_STATUS = { dot: "bg-gray-300", label: "—", text: "text-gray-500", bg: "bg-gray-50", ring: "ring-gray-100" };

/* ─── Helpers ───────────────────────────────────────────────────── */
function fmtIDR(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} jt`;
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (d >= 365) return `${Math.floor(d / 365)} thn`;
  if (d >= 30)  return `${Math.floor(d / 30)} bln`;
  if (d > 0)    return `${d}h lalu`;
  if (h > 0)    return `${h}j lalu`;
  if (m > 0)    return `${m}m lalu`;
  return "Baru saja";
}

/* ─── Types ─────────────────────────────────────────────────────── */
type SortKey = "client_name" | "claim_date" | "total_amount";
type SortDir = "asc" | "desc";

interface Props {
  claims: Claim[];
  limit?: number;
  showViewAll?: boolean;
  role?: string;
}

/* ─── Component ─────────────────────────────────────────────────── */
export function ClaimsDataTable({ claims: raw, limit, showViewAll = true, role = "admin_agency" }: Props) {
  const [search,      setSearch]      = useState("");
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [filterStatus,setFilterStatus]= useState<string | null>(null);
  const [sort,        setSort]        = useState<{ key: SortKey; dir: SortDir }>({ key: "claim_date", dir: "desc" });
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(["client_name", "hospital_name", "claim_date", "total_amount", "status"]));
  const [density,     setDensity]     = useState<"comfortable" | "compact">("comfortable");
  const searchRef = useRef<HTMLInputElement>(null);

  const COL_NAMES: Record<string, string> = {
    client_name: "Klien",
    hospital_name: "Rumah Sakit",
    disease_name: "Diagnosa",
    claim_date: "Tanggal",
    total_amount: "Nominal",
    status: "Status"
  };

  const toggleCol = (col: string) => {
      setVisibleCols(prev => {
          const next = new Set(prev);
          if (next.has(col)) {
              if (next.size > 1) next.delete(col);
          } else next.add(col);
          return next;
      });
  };

  /* per-status counts */
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const cl of raw) c[cl.status] = (c[cl.status] || 0) + 1;
    return c;
  }, [raw]);

  /* filtered + sorted (+ limited) data */
  const rows = useMemo(() => {
    let r = [...raw];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.client_name.toLowerCase().includes(q) ||
        c.hospital_name.toLowerCase().includes(q) ||
        (c.disease_name || "").toLowerCase().includes(q) ||
        c.policy_number.toLowerCase().includes(q)
      );
    }
    if (filterStatus) r = r.filter(c => c.status === filterStatus);
    r.sort((a, b) => {
      const [av, bv] =
        sort.key === "client_name"   ? [a.client_name, b.client_name] :
        sort.key === "total_amount"  ? [a.total_amount, b.total_amount] :
        [new Date(a.claim_date).getTime(), new Date(b.claim_date).getTime()];
      if (typeof av === "number" && typeof bv === "number")
        return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return limit ? r.slice(0, limit) : r;
  }, [raw, search, filterStatus, sort, limit]);

  const cycleSort = (key: SortKey) =>
    setSort(p => ({ key, dir: p.key === key ? (p.dir === "asc" ? "desc" : "asc") : "desc" }));

  const allSelected  = rows.length > 0 && rows.every(c => selected.has(c.claim_id));
  const someSelected = selected.size > 0;

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map(c => c.claim_id)));

  const toggleRow = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const detailUrl = (id: string) =>
    role === "admin_agency" ? `/admin-agency/claims/${id}` :
    role === "hospital"     ? `/hospital/claims/${id}` :
    role === "agent"        ? `/agent/claims/${id}` : "#";

  /* sort indicator */
  const SortIcon = ({ col }: { col: SortKey }) =>
    sort.key !== col
      ? <ChevronsUpDown className="w-3 h-3 text-gray-300 group-hover/th:text-gray-400 transition-colors" />
      : sort.dir === "asc"
        ? <ChevronUp   className="w-3 h-3 text-gray-800" />
        : <ChevronDown className="w-3 h-3 text-gray-800" />;

  /* checkbox square */
  const Checkbox = ({ checked, indeterminate, onClick, invisible }: {
    checked: boolean; indeterminate?: boolean; onClick: () => void; invisible?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-[15px] h-[15px] rounded-[3px] border-[1.5px] flex items-center justify-center transition-all duration-150 shrink-0",
        checked         ? "bg-gray-900 border-gray-900 shadow-sm" :
        indeterminate   ? "bg-gray-200 border-gray-300" :
                          "border-gray-300 hover:border-gray-500 bg-white",
        invisible && !someSelected && "opacity-0 group-hover/row:opacity-100"
      )}
    >
      {checked     && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
      {indeterminate && !checked && <div className="w-2 h-[1.5px] bg-gray-600 rounded-full" />}
    </button>
  );

  const filterStatuses = Object.keys(statusCounts);

  return (
    <div className="flex flex-col">

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-gray-50">
        {/* Left */}
        {someSelected ? (
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
            <p className="text-sm font-bold text-gray-900">Antrean Klaim</p>
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 tabular-nums">
              {raw.length}
            </span>
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Export CSV Button */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all outline-none">
              <Download className="w-4 h-4" />
              Ekspor CSV
          </button>

          {/* View Options Dropdown */}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all outline-none">
                      <SlidersHorizontal className="w-4 h-4" />
                      Tampilan
                  </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl">
                  <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Visibilitas Kolom</DropdownMenuLabel>
                  {Object.entries(COL_NAMES).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                          key={key}
                          checked={visibleCols.has(key)}
                          onCheckedChange={() => toggleCol(key)}
                          className="font-medium cursor-pointer rounded-md"
                      >
                          {label}
                      </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator className="my-2 bg-gray-100" />
                  <DropdownMenuLabel className="text-xs text-gray-400 font-bold uppercase tracking-wider">Kepadatan Tabel</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={density === "comfortable"} onCheckedChange={() => setDensity("comfortable")} className="font-medium cursor-pointer rounded-md">Nyaman</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={density === "compact"} onCheckedChange={() => setDensity("compact")} className="font-medium cursor-pointer rounded-md">Padat</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
          </DropdownMenu>

          {/* Expandable search */}
          <div className={cn(
            "flex items-center gap-2 h-8 rounded-xl border bg-white transition-all duration-250 overflow-hidden",
            searchOpen
              ? "w-48 border-gray-300 px-3 shadow-sm"
              : "w-8 border-transparent justify-center hover:border-gray-200 hover:bg-gray-50 cursor-pointer"
          )}>
            <button
              onClick={() => { setSearchOpen(v => !v); if (!searchOpen) setTimeout(() => searchRef.current?.focus(), 60); }}
              className="shrink-0 flex items-center justify-center"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {searchOpen && (
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari klaim…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
                onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }}
              />
            )}
            {searchOpen && search && (
              <button onClick={() => setSearch("")} className="shrink-0">
                <X className="w-3 h-3 text-gray-400 hover:text-gray-700 transition-colors" />
              </button>
            )}
          </div>

          {/* Filter */}
          <button
            onClick={() => filterStatus && setFilterStatus(null)}
            className={cn(
              "h-8 px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all duration-150",
              filterStatus
                ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {filterStatus ? (STATUS_CFG[filterStatus]?.label ?? "Filter") : "Filter"}
            {filterStatus && <X className="w-2.5 h-2.5 ml-0.5 opacity-70" />}
          </button>
        </div>
      </div>

      {/* ── Status chips ──────────────────────────────────────────── */}
      {filterStatuses.length > 1 && (
        <div className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 border-b border-gray-50 overflow-x-auto">
          <button
            onClick={() => setFilterStatus(null)}
            className={cn(
              "flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
              !filterStatus ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            Semua
            <span className={cn(
              "inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold tabular-nums",
              !filterStatus ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
            )}>{raw.length}</span>
          </button>

          {filterStatuses.map(st => {
            const cfg = STATUS_CFG[st] || FALLBACK_STATUS;
            const active = filterStatus === st;
            return (
              <button key={st}
                onClick={() => setFilterStatus(p => p === st ? null : st)}
                className={cn(
                  "flex items-center gap-1.5 h-[22px] px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-150 shrink-0",
                  active
                    ? `${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
                {cfg.label}
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold tabular-nums",
                  active ? "bg-white/50" : "bg-gray-200 text-gray-500"
                )}>{statusCounts[st]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">

          {/* Header */}
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
              <th className="w-10 pl-5 sm:pl-6 pr-3 py-3.5 border-b border-gray-200">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onClick={toggleAll}
                />
              </th>
              {([
                { col: "client_name" as SortKey, label: "Klien",      sortable: true  },
                { col: "hospital_name" as SortKey,label: "Rumah Sakit", sortable: false },
                { col: "disease_name" as SortKey, label: "Diagnosa",   sortable: false, hidden: true },
                { col: "claim_date" as SortKey,   label: "Tanggal",    sortable: true  },
                { col: "total_amount" as SortKey, label: "Nominal",    sortable: true, right: true },
                { col: "status" as SortKey,       label: "Status",     sortable: false },
              ] as Array<{ col: string; label: string; sortable: boolean; hidden?: boolean; right?: boolean }>).map((h, i) => (
                visibleCols.has(h.col) && (
                  <th key={i}
                    className={cn(
                      "px-5 py-3.5 text-xs font-bold uppercase tracking-wider select-none border-b border-gray-200 text-left text-gray-500",
                      h.hidden && "hidden lg:table-cell",
                      h.right  && "text-right"
                    )}
                  >
                    {h.sortable ? (
                      <button
                        onClick={() => cycleSort(h.col as SortKey)}
                        className={cn(
                          "group/th flex items-center gap-1 transition-colors hover:text-gray-900",
                          sort.key === h.col ? "text-black" : "text-gray-500",
                          h.right && "ml-auto"
                        )}
                      >
                        {h.label}
                        <SortIcon col={h.col as SortKey} />
                      </button>
                    ) : (
                      <span>{h.label}</span>
                    )}
                  </th>
                )
              ))}
              <th className="w-14 pr-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 right-0 z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]" />
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gray-200" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-400">
                        {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada klaim"}
                      </p>
                      {(search || filterStatus) && (
                        <button
                          onClick={() => { setSearch(""); setSearchOpen(false); setFilterStatus(null); }}
                          className="text-xs text-gray-500 underline underline-offset-2 mt-1 hover:text-gray-900 transition-colors"
                        >
                          Hapus filter
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((claim, idx) => {
                const cfg  = STATUS_CFG[claim.status] || FALLBACK_STATUS;
                const isSel = selected.has(claim.claim_id);
                const pyClass = density === "compact" ? "py-2.5" : "py-4";
                return (
                  <tr
                    key={claim.claim_id}
                    className={cn(
                      "group/row transition-colors cursor-pointer",
                      isSel ? "bg-blue-50/40" : "hover:bg-gray-50/80"
                    )}
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
                    {/* Checkbox */}
                    <td className={`pl-5 sm:pl-6 pr-3 ${pyClass}`}>
                      <Checkbox
                        checked={isSel}
                        onClick={() => toggleRow(claim.claim_id)}
                        invisible
                      />
                    </td>

                    {/* Client */}
                    {visibleCols.has("client_name") && (
                    <td className={`px-5 ${pyClass}`}>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[150px] leading-tight">{claim.client_name}</p>
                        <p className="text-[10px] text-gray-400 tracking-wide mt-0.5">{claim.policy_number}</p>
                      </div>
                    </td>
                    )}

                    {/* Hospital */}
                    {visibleCols.has("hospital_name") && (
                    <td className={`px-5 ${pyClass}`}>
                      <p className="text-[13px] text-gray-500 truncate max-w-[140px]">{claim.hospital_name}</p>
                    </td>
                    )}

                    {/* Disease */}
                    {visibleCols.has("disease_name") && (
                    <td className={`px-5 ${pyClass} hidden lg:table-cell`}>
                      {claim.disease_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-50 text-gray-500 border border-gray-100 max-w-[110px] truncate">{claim.disease_name}</span>
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    )}

                    {/* Date */}
                    {visibleCols.has("claim_date") && (
                    <td className={`px-5 ${pyClass}`}>
                      <span
                        title={new Date(claim.claim_date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                        className="text-[13px] text-gray-500 cursor-default"
                      >
                        {relDate(claim.claim_date)}
                      </span>
                    </td>
                    )}

                    {/* Amount */}
                    {visibleCols.has("total_amount") && (
                    <td className={`px-5 ${pyClass} text-right`}>
                      <span className="text-[13px] font-bold text-gray-900 tabular-nums">{fmtIDR(claim.total_amount)}</span>
                    </td>
                    )}

                    {/* Status */}
                    {visibleCols.has("status") && (
                    <td className={`px-5 ${pyClass}`}>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase ring-1 whitespace-nowrap",
                        cfg.bg, cfg.text, cfg.ring
                      )}>
                        {cfg.label}
                      </span>
                    </td>
                    )}

                    {/* Enterprise Sticky Actions Column */}
                    <td className={cn(`pr-5 ${pyClass} text-right sticky right-0 z-0 transition-colors`, isSel ? "bg-blue-50/40" : "bg-white group-hover/row:bg-gray-50/80", "shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]")} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                            <Link href={detailUrl(claim.claim_id)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors outline-none" title="Lihat Profil">
                                <Eye className="w-4 h-4" />
                            </Link>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors outline-none">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lg border-gray-100">
                                    <DropdownMenuItem asChild className="cursor-pointer font-medium rounded-lg py-2">
                                        <Link href={detailUrl(claim.claim_id)}>
                                            <Eye className="w-4 h-4 mr-2 text-gray-500" /> Lihat Detail Klaim
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(claim.claim_id); }} className="cursor-pointer font-medium rounded-lg py-2">
                                        <Copy className="w-4 h-4 mr-2 text-gray-500" /> Salin ID Klaim
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-gray-100" />
                                    <DropdownMenuItem className="cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg py-2">
                                        <Trash2 className="w-4 h-4 mr-2" /> Hapus
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-gray-50 bg-gray-50/30">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-600 tabular-nums">{rows.length}</span>
          {" "}dari{" "}
          <span className="font-semibold text-gray-600 tabular-nums">{raw.length}</span>
          {" "}klaim
          {filterStatus && (
            <span className="ml-1 text-gray-400">
              · filter: <span className="font-medium">{STATUS_CFG[filterStatus]?.label ?? filterStatus}</span>
            </span>
          )}
        </p>
        {showViewAll && (
          <Link
            href="/admin-agency/claims"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors group/link"
          >
            Lihat Semua
            <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform duration-150" />
          </Link>
        )}
      </div>
    </div>
  );
}
