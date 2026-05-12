"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsUpDown, ChevronUp, ChevronDown, X, Copy, Check,
  FileText, Briefcase, Eye, Pencil, Save,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import { toast } from "@/hooks/use-toast";
import { PageShell, PageHeader, StatCard, StatsGrid } from "@/components/dashboard/page-shell";

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

interface ClientDetail extends Client {
  person_id: string;
  nik: string | null;
  phone_number: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  gender: string | null;
  agent_email: string | null;
  agent_id: string | null;
  agency_id: string | null;
}

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
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-gray-100 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-gray-700" /> : <Copy className="h-3 w-3 text-gray-400" />}
    </button>
  );
}

type SortCol = "full_name" | "agency_name" | "total_policies" | "total_claims" | "created_at";

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-sm text-black">{value || "—"}</span>
    </div>
  );
}

export default function DeveloperClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<SortCol>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const searchRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const { run } = useBusy();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20", search });
      const res = await fetch(`/api/developer/clients?${params}`);
      const json = await res.json();
      if (res.ok) {
        const sorted = [...json.data].sort((a: Client, b: Client) => {
          const av = a[sortBy] ?? "";
          const bv = b[sortBy] ?? "";
          const cmp = typeof av === "number" ? (av as number) - (bv as number) : String(av).localeCompare(String(bv), "id");
          return sortOrder === "asc" ? cmp : -cmp;
        });
        setClients(sorted);
        setTotalPages(json.meta.totalPages);
        setTotal(json.meta.total);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => { const t = setTimeout(fetchClients, 300); return () => clearTimeout(t); }, [fetchClients]);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("asc"); }
  };

  const openDetail = (clientId: string) => {
    router.push(`/developer/clients/${clientId}`);
  };

  function SortTh({ label, col, className = "" }: { label: string; col: SortCol; className?: string }) {
    const active = sortBy === col;
    return (
      <th onClick={() => toggleSort(col)} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${active ? "text-black" : "text-gray-400 hover:text-gray-600"} ${className}`}>
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (sortOrder === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
        </span>
      </th>
    );
  }

  const totalPolicies = clients.reduce((s, c) => s + c.total_policies, 0);
  const totalClaims = clients.reduce((s, c) => s + c.total_claims, 0);

  return (
    <>
      <PageShell>
        <PageHeader
          title="Manajemen Klien"
          description={`${total.toLocaleString()} klien terdaftar di seluruh platform`}
        />

        <StatsGrid cols={3}>
          <StatCard label="Total Klien" value={loading ? "—" : total} icon={Users} />
          <StatCard label="Total Polis" value={loading ? "—" : totalPolicies} icon={FileText} />
          <StatCard label="Total Klaim" value={loading ? "—" : totalClaims} icon={Briefcase} />
        </StatsGrid>

        {/* Table */}
        <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-black">Klien</span>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                {loading ? "—" : total}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5">
                <button onClick={() => { if (searchOpen) { setSearchOpen(false); setSearch(""); } else setSearchOpen(true); }} className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
                  {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${searchOpen ? "w-48" : "w-0"}`}>
                  <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }} placeholder="Cari nama, agen, agensi…" className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1" />
                </div>
              </div>
              <button onClick={() => fetchClients()} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <SortTh label="Nama Klien" col="full_name" className="text-left" />
                  <SortTh label="Agen" col="agency_name" className="text-left" />
                  <SortTh label="Agensi" col="agency_name" className="text-left" />
                  <SortTh label="Polis" col="total_policies" className="text-right" />
                  <SortTh label="Klaim" col="total_claims" className="text-right" />
                  <SortTh label="Bergabung" col="created_at" className="text-right" />
                  <th className="w-20 pr-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-5 py-4"><div className="h-3.5 w-36 bg-gray-100 rounded animate-pulse" /></td>
                      {[1, 2, 3, 4, 5].map(j => (
                        <td key={j} className="px-5 py-4"><div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                      <td className="px-4 py-4" />
                    </tr>
                  ))
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">
                      {search ? "Tidak ada klien yang cocok" : "Belum ada data klien"}
                    </td>
                  </tr>
                ) : (
                  clients.map(c => (
                    <tr key={c.client_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group/row">
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black truncate max-w-[220px]">{c.full_name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-xs text-gray-400 truncate max-w-[140px] font-mono">{c.client_id}</p>
                            <CopyButton text={c.client_id} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 truncate max-w-[160px] block">{c.agent_name ?? "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500 truncate max-w-[160px] block">{c.agency_name ?? "—"}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-black tabular-nums">{c.total_policies}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-semibold text-black tabular-nums">{c.total_claims}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs font-medium text-gray-700">{fmtDate(c.created_at)}</span>
                          <span className="text-xs text-gray-400">{relDate(c.created_at)}</span>
                        </div>
                      </td>
                      <td className="pr-4 py-4 text-right">
                        <Link
                          href={`/developer/clients/${c.client_id}`}
                          className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 inline-block"
                          title="Lihat Detail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              {loading ? "Memuat…" : `${clients.length} dari ${total.toLocaleString()} klien · Halaman ${page} dari ${totalPages}`}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200 transition-all">
                <ChevronLeft className="h-3 w-3" /> Sebelumnya
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all ${p === page ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
                  );
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200 transition-all">
                Selanjutnya <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </PageShell>


    </>
  );
}
