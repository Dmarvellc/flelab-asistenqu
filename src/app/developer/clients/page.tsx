"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsUpDown, ChevronUp, ChevronDown, X, Copy, Check,
  FileText, Briefcase, Eye, Download, Filter, SlidersHorizontal, MoreHorizontal, Trash2, ShieldAlert,
  Loader2
} from "lucide-react";

import { useBusy } from "@/components/ui/busy-overlay-provider";
import { useToast } from "@/hooks/use-toast";
import { PageShell, PageHeader, StatCard, StatsGrid } from "@/components/dashboard/page-shell";
import { ActionModal } from "@/components/ui/action-modal";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Client {
  client_id: string;
  full_name: string;
  status: string;
  created_at: string;
  agent_name: string | null;
  agency_name: string | null;
  total_policies: number;
  total_claims: number;
}

const COL_NAMES: Record<string, string> = {
    full_name: "Nama Klien",
    agent_name: "Agen",
    agency_name: "Agensi",
    total_policies: "Polis",
    total_claims: "Klaim",
    created_at: "Bergabung"
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}h lalu` : fmtDate(iso);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => { 
    e.stopPropagation(); 
    e.preventDefault();
    navigator.clipboard.writeText(text); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 1500); 
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-200 transition-colors"
      title="Salin ID"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-gray-500 hover:text-gray-900" />}
    </button>
  );
}

type SortCol = "full_name" | "agency_name" | "total_policies" | "total_claims" | "created_at";

export default function DeveloperClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Enterprise Table States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortCol>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");

  // View Options
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(["full_name", "agent_name", "agency_name", "total_policies", "total_claims", "created_at"]));
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // Selection & Actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { run } = useBusy();
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
      // Backend api/developer/clients doesn't support status filter by default in the old code,
      // but we can pass it if supported, or filter client-side if not. For now we pass it.
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/developer/clients?${params}`);
      const json = await res.json();
      if (res.ok) {
        let sorted = [...json.data];
        
        // Client-side status filter fallback if API ignores it
        if (statusFilter) {
            sorted = sorted.filter((c: Client) => c.status === statusFilter);
        }

        sorted = sorted.sort((a: Client, b: Client) => {
          const av = a[sortBy] ?? "";
          const bv = b[sortBy] ?? "";
          const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv), "id");
          return sortOrder === "asc" ? cmp : -cmp;
        });

        setClients(sorted);
        setTotalPages(json.meta?.totalPages || Math.ceil(json.meta?.total / limit) || 1);
        setTotal(json.meta?.total || sorted.length);
      }
    } catch { 
        toast({ title: "Error", description: "Gagal memuat klien", variant: "destructive" });
    } finally { 
        setLoading(false); 
    }
  }, [page, limit, search, sortBy, sortOrder, statusFilter, toast]);

  useEffect(() => { const t = setTimeout(fetchClients, 400); return () => clearTimeout(t); }, [fetchClients]);

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
    setPage(1);
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

  const allIds = clients.map(c => c.client_id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const someSelected = allIds.some(id => selected.has(id));
  const toggleAll = () => { if (allSelected) setSelected(new Set()); else setSelected(new Set(allIds)); };
  const toggleRow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected(prev => {
          const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
      });
  };

  const handleExportCSV = () => {
      const headers = ["ID", "Nama Klien", "Agen", "Agensi", "Polis", "Klaim", "Status", "Bergabung"];
      const rows = clients.map(c => [
          c.client_id, 
          `"${c.full_name}"`, 
          `"${c.agent_name || "-"}"`, 
          `"${c.agency_name || "-"}"`, 
          c.total_policies,
          c.total_claims,
          c.status,
          fmtDate(c.created_at)
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "data_klien.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Berhasil Mengunduh", description: "File CSV data klien sedang diunduh." });
  };

  const handleDelete = async (clientId: string) => {
      await run(async () => {
          // Implement delete logic if endpoint exists, or mock it for UI consistency
          toast({ title: "Dihapus", description: "Fungsi hapus klien memerlukan endpoint API yang sesuai." });
          setSelected(new Set());
      }, "Menghapus klien…");
  };

  function SortTh({ label, col, className = "" }: { label: string; col: SortCol; className?: string }) {
      if (!visibleCols.has(col)) return null;
      const active = sortBy === col;
      return (
          <th onClick={() => toggleSort(col)} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider cursor-pointer select-none transition-colors border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 ${active ? "text-black" : "text-gray-500 hover:text-gray-900"} ${className}`}>
              <span className={cn("inline-flex items-center gap-1", className.includes('text-right') ? 'justify-end w-full' : '')}>
                  {label}
                  {active ? (sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5 opacity-30" />}
              </span>
          </th>
      );
  }

  const totalPolicies = clients.reduce((s, c) => s + c.total_policies, 0);
  const totalClaims = clients.reduce((s, c) => s + c.total_claims, 0);
  
  const pyClass = density === "compact" ? "py-2.5" : "py-4";
  const hasFilters = statusFilter !== "";

  return (
    <>
      <PageShell>
        <PageHeader
          title="Manajemen Klien"
          description={`${total.toLocaleString()} klien terdaftar di seluruh platform`}
        />

        <StatsGrid cols={3}>
          <StatCard label="Total Klien" value={loading ? "—" : total} icon={Users} onClick={() => { setStatusFilter(""); setPage(1); }} />
          <StatCard label="Total Polis" value={loading ? "—" : totalPolicies} icon={FileText} onClick={() => { setSortBy("total_policies"); setSortOrder("desc"); }} />
          <StatCard label="Total Klaim" value={loading ? "—" : totalClaims} icon={Briefcase} onClick={() => { setSortBy("total_claims"); setSortOrder("desc"); }} />
        </StatsGrid>

        {/* Enterprise Table Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
            
            {/* Quick Tabs */}
            <div className="flex items-center gap-6 px-5 pt-3 border-b border-gray-200 bg-gray-50/50 overflow-x-auto scrollbar-none">
                <button onClick={() => { setStatusFilter(""); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700")}>Semua Klien</button>
                <button onClick={() => { setStatusFilter("ACTIVE"); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "ACTIVE" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>Aktif</button>
                <button onClick={() => { setStatusFilter("INACTIVE"); setPage(1); }} className={cn("pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors", statusFilter === "INACTIVE" ? "border-gray-500 text-gray-700" : "border-transparent text-gray-500 hover:text-gray-700")}>Tidak Aktif</button>
            </div>

            {/* Advanced Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white">
                {/* Left: Search & Bulk Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Cari nama, agen, agensi…"
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-400 transition-all placeholder:text-gray-400 font-medium"
                        />
                        {search && (
                            <button onClick={() => { setSearch(""); setPage(1); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    {someSelected && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg shrink-0">
                            <span className="text-sm font-semibold text-blue-700">{selected.size} terpilih</span>
                            <div className="w-px h-4 bg-blue-200 mx-1" />
                            <button
                                onClick={() => { if (selected.size === 1) setDeleteTargetId([...selected][0]); }}
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
                            >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Filters & View Options */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Export CSV Button */}
                    <button onClick={handleExportCSV} className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all outline-none">
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

                    <button onClick={fetchClients} className="p-2.5 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all" title="Segarkan Data">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-black' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table Area (Scrollable with sticky header) */}
            <div className="overflow-x-auto relative max-h-[600px]">
                <table className="w-full text-sm min-w-[720px] text-left border-collapse">
                    <thead>
                        <tr>
                            <th className="w-12 pl-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                                <button
                                    onClick={toggleAll}
                                    className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", allSelected || someSelected ? "bg-black border-black text-white" : "border-gray-300 hover:border-gray-400 bg-white")}
                                >
                                    {allSelected ? <Check className="w-3 h-3" strokeWidth={3} /> : someSelected ? <div className="w-2 h-0.5 bg-white rounded-full" /> : null}
                                </button>
                            </th>
                            <SortTh label="Nama Klien" col="full_name" />
                            <SortTh label="Agen" col="agency_name" />
                            <SortTh label="Agensi" col="agency_name" />
                            <SortTh label="Polis" col="total_policies" className="text-right" />
                            <SortTh label="Klaim" col="total_claims" className="text-right" />
                            <SortTh label="Bergabung" col="created_at" className="text-right" />
                            <th className="w-14 pr-5 py-3.5 border-b border-gray-200 bg-gray-50/80 backdrop-blur-sm sticky top-0 right-0 z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            Array.from({ length: limit }).map((_, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className={`pl-5 ${pyClass}`}><div className="w-4 h-4 rounded border border-gray-100 bg-gray-50 animate-pulse" /></td>
                                    {visibleCols.has("full_name") && <td className={`px-5 ${pyClass}`}><div className="space-y-2"><div className="h-4 w-40 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-32 bg-gray-50 rounded animate-pulse" /></div></td>}
                                    {visibleCols.has("agent_name") && <td className={`px-5 ${pyClass}`}><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /></td>}
                                    {visibleCols.has("agency_name") && <td className={`px-5 ${pyClass}`}><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /></td>}
                                    {visibleCols.has("total_policies") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-10 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                    {visibleCols.has("total_claims") && <td className={`px-5 ${pyClass} text-right`}><div className="h-4 w-10 bg-gray-100 rounded animate-pulse ml-auto" /></td>}
                                    {visibleCols.has("created_at") && <td className={`px-5 ${pyClass}`}><div className="flex flex-col items-end space-y-2"><div className="h-4 w-24 bg-gray-100 rounded animate-pulse" /><div className="h-3 w-16 bg-gray-50 rounded animate-pulse" /></div></td>}
                                    <td className={`pr-5 ${pyClass} text-right sticky right-0 bg-white shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]`}><div className="h-8 w-8 bg-gray-100 rounded-lg animate-pulse ml-auto" /></td>
                                </tr>
                            ))
                        ) : clients.length === 0 ? (
                            <tr>
                                <td colSpan={visibleCols.size + 2} className="px-6 py-24 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Search className="w-10 h-10 mb-4 opacity-20" />
                                        <p className="text-base font-semibold text-gray-700 mb-1">{search || hasFilters ? "Tidak ada klien yang cocok" : "Belum ada data klien"}</p>
                                        <p className="text-sm">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            clients.map(c => {
                                const isSelected = selected.has(c.client_id);
                                
                                return (
                                    <tr 
                                        key={c.client_id} 
                                        onClick={() => router.push(`/developer/clients/${c.client_id}`)}
                                        className={cn("group transition-colors cursor-pointer", isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/80")}
                                    >
                                        <td className={`pl-5 ${pyClass}`} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => toggleRow(c.client_id, e)}
                                                className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all", isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 group-hover:border-gray-400 bg-white")}
                                            >
                                                {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                            </button>
                                        </td>
                                        
                                        {visibleCols.has("full_name") && (
                                            <td className={`px-5 ${pyClass}`}>
                                                <div className="min-w-0 flex items-center">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[240px] leading-snug">{c.full_name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <p className="text-[11px] font-medium text-gray-500 font-mono truncate max-w-[160px]">{c.client_id}</p>
                                                            <CopyButton text={c.client_id} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        
                                        {visibleCols.has("agent_name") && (
                                            <td className={`px-5 ${pyClass}`}>
                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[160px] block">{c.agent_name || "—"}</span>
                                            </td>
                                        )}
                                        
                                        {visibleCols.has("agency_name") && (
                                            <td className={`px-5 ${pyClass}`}>
                                                <span className="text-sm font-medium text-gray-500 truncate max-w-[160px] block">{c.agency_name || "—"}</span>
                                            </td>
                                        )}

                                        {visibleCols.has("total_policies") && (
                                            <td className={`px-5 ${pyClass} text-right`}>
                                                <span className="text-sm font-bold text-gray-900 tabular-nums">{c.total_policies}</span>
                                            </td>
                                        )}

                                        {visibleCols.has("total_claims") && (
                                            <td className={`px-5 ${pyClass} text-right`}>
                                                <span className="text-sm font-bold text-gray-900 tabular-nums">{c.total_claims}</span>
                                            </td>
                                        )}
                                        
                                        {visibleCols.has("created_at") && (
                                            <td className={`px-5 ${pyClass} text-right`}>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <span className="text-sm font-semibold text-gray-900">{fmtDate(c.created_at)}</span>
                                                    <span className="text-[11px] font-medium text-gray-500">{relDate(c.created_at)}</span>
                                                </div>
                                            </td>
                                        )}
                                        
                                        {/* Enterprise Sticky Actions Column */}
                                        <td className={cn(`pr-5 ${pyClass} text-right sticky right-0 z-0 transition-colors`, isSelected ? "bg-blue-50/40" : "bg-white group-hover:bg-gray-50/80", "shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]")} onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => router.push(`/developer/clients/${c.client_id}`)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors outline-none" title="Lihat Profil">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors outline-none">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-lg border-gray-100">
                                                        <DropdownMenuItem onClick={() => router.push(`/developer/clients/${c.client_id}`)} className="cursor-pointer font-medium rounded-lg py-2">
                                                            <Eye className="w-4 h-4 mr-2 text-gray-500" /> Lihat Detail Klien
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.client_id); toast({description: "ID disalin ke clipboard"}); }} className="cursor-pointer font-medium rounded-lg py-2">
                                                            <Copy className="w-4 h-4 mr-2 text-gray-500" /> Salin ID Klien
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-gray-100" />
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteTargetId(c.client_id); }} className="cursor-pointer font-bold text-red-600 focus:bg-red-50 focus:text-red-700 rounded-lg py-2">
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

            {/* Advanced Footer Pagination */}
            <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
                <div className="flex items-center gap-4 w-full sm:w-auto text-sm font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                        <span>Tampilkan</span>
                        <select 
                            value={limit} 
                            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                            className="bg-white border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black/10 font-bold text-gray-900"
                        >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                        <span>baris</span>
                    </div>
                    <div className="hidden sm:block w-px h-4 bg-gray-300" />
                    <p className="hidden sm:block">
                        {loading ? "Memuat…" : `${clients.length} dari total ${total.toLocaleString()} klien`}
                    </p>
                </div>
                
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                        <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <div className="hidden sm:flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                            if (p < 1 || p > totalPages) return null;
                            return (
                                <button 
                                    key={p} 
                                    onClick={() => setPage(p)} 
                                    className={cn("w-8 h-8 rounded-lg text-sm font-bold transition-all flex items-center justify-center", p === page ? "bg-black text-white shadow-md" : "text-gray-600 hover:bg-gray-200")}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>
                    <span className="sm:hidden text-sm font-bold text-gray-700">Hal {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-black disabled:opacity-40 disabled:pointer-events-none transition-all shadow-sm">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
      </PageShell>

      <ActionModal
          open={deleteTargetId !== null}
          onOpenChange={open => { if (!open) setDeleteTargetId(null); }}
          title="Hapus Klien"
          description="Apakah Anda yakin ingin menghapus data klien ini? Tindakan ini tidak dapat dibatalkan."
          confirmText="Ya, Hapus"
          cancelText="Batal"
          destructive
          onConfirm={async () => {
              if (!deleteTargetId) return;
              await handleDelete(deleteTargetId);
              setDeleteTargetId(null);
          }}
      />
    </>
  );
}
