"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AgencyAgent, AgencyClient } from "@/services/admin-agency";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  X, Check, ArrowRight, Users, UserCog, Shield,
  Download, Loader2, UserX, CheckCheck,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SortKey = "full_name" | "total_policies" | "agent_name";
type SortDir = "asc" | "desc";

interface Props {
  clients: AgencyClient[];
  agents: AgencyAgent[];
  showBulkAssign?: boolean;
  baseUrl?: string;
}

export function ClientsTable({ clients: initialClients, agents, showBulkAssign = false, baseUrl }: Props) {
  const router = useRouter();
  const [clients,         setClients]         = useState(initialClients);
  const [search,          setSearch]          = useState("");
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [sort,            setSort]            = useState<{ key: SortKey; dir: SortDir }>({ key: "full_name", dir: "asc" });
  const [selected,        setSelected]        = useState<Set<string>>(new Set());
  const [processingId,    setProcessingId]    = useState<string | null>(null);
  const [bulkLoading,     setBulkLoading]     = useState(false);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [bulkModalOpen,   setBulkModalOpen]   = useState(false);
  const [selClient,       setSelClient]       = useState<AgencyClient | null>(null);
  const [selAgent,        setSelAgent]        = useState("");
  const [bulkAgent,       setBulkAgent]       = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const maxPolicies = useMemo(() => Math.max(...clients.map(c => c.total_policies), 1), [clients]);

  const rows = useMemo(() => {
    let r = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        (c.agent_name ?? "").toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      const [av, bv] =
        sort.key === "total_policies" ? [a.total_policies, b.total_policies] :
        sort.key === "agent_name"     ? [a.agent_name ?? "", b.agent_name ?? ""] :
        [a.full_name, b.full_name];
      if (typeof av === "number" && typeof bv === "number")
        return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return r;
  }, [clients, search, sort]);

  const cycleSort = (key: SortKey) =>
    setSort(p => ({ key, dir: p.key === key ? (p.dir === "asc" ? "desc" : "asc") : "desc" }));

  const allSel  = rows.length > 0 && rows.every(c => selected.has(c.client_id));
  const someSel = selected.size > 0;
  const toggleAll = () => setSelected(allSel ? new Set() : new Set(rows.map(c => c.client_id)));
  const toggleRow = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openReassign = (client: AgencyClient) => {
    setSelClient(client);
    setSelAgent(client.agent_id ?? "");
    setModalOpen(true);
  };

  const confirmReassign = async () => {
    if (!selClient || !selAgent) { setModalOpen(false); return; }
    if (selAgent === (selClient.agent_id ?? "")) { setModalOpen(false); return; }
    setProcessingId(selClient.client_id);
    try {
      const res = await fetch("/api/admin-agency/clients/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selClient.client_id, newAgentId: selAgent }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const newName = agents.find(a => a.user_id === selAgent)?.full_name ?? "—";
      setClients(prev => prev.map(c =>
        c.client_id === selClient.client_id
          ? { ...c, agent_id: selAgent, agent_name: newName }
          : c
      ));
      toast({ title: "Berhasil", description: "Klien berhasil dipindahkan." });
      setModalOpen(false);
    } catch (err) {
      toast({ title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const confirmBulkAssign = async () => {
    if (!bulkAgent || selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin-agency/clients/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientIds: [...selected], agentId: bulkAgent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal");

      const agentName = agents.find(a => a.user_id === bulkAgent)?.full_name ?? "—";
      const assignedIds = new Set([...selected]);
      setClients(prev => prev.filter(c => !assignedIds.has(c.client_id)));
      setSelected(new Set());
      setBulkModalOpen(false);
      toast({ title: "Berhasil", description: `${json.assigned} klien ditugaskan ke ${agentName}.` });
      router.refresh();
    } catch (err) {
      toast({ title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setBulkLoading(false);
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
      "w-4 h-4 rounded-sm border border-gray-300 flex items-center justify-center transition-all duration-150 shrink-0",
      checked       ? "bg-black border-black shadow-sm" :
      indeterminate ? "bg-gray-200 border-gray-300" :
                      "hover:border-gray-400 bg-white",
      invisible && !someSel && "opacity-0 group-hover/row:opacity-100"
    )}>
      {checked       && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
      {indeterminate && !checked && <div className="w-2 h-[1.5px] bg-gray-600 rounded-full" />}
    </button>
  );

  return (
    <>
      <div className="flex flex-col">

        {/* ── Toolbar ── */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          {someSel ? (
            <div className="flex items-center gap-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
              <span className="text-sm font-semibold text-black tabular-nums">{selected.size} dipilih</span>
              <div className="w-px h-4 bg-gray-200" />
              {showBulkAssign && (
                <button
                  onClick={() => { setBulkAgent(""); setBulkModalOpen(true); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-black hover:text-black px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Tugaskan ke Agen
                </button>
              )}
              <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                <Download className="w-3.5 h-3.5" /> Ekspor
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-black">
                {showBulkAssign ? "Belum Ditugaskan" : "Direktori Klien"}
              </span>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                {clients.length}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1.5">
              <button onClick={() => { if (searchOpen) { setSearchOpen(false); setSearch(""); } else setSearchOpen(true); }} className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors">
                {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
              </button>
              <div className={`overflow-hidden transition-all duration-200 ${searchOpen ? "w-48" : "w-0"}`}>
                <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); }} onKeyDown={e => { if (e.key === "Escape") { setSearchOpen(false); setSearch(""); } }} placeholder="Cari klien…" className="w-full text-xs bg-transparent outline-none text-gray-700 placeholder:text-gray-400 px-1" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                <th className="w-10 pl-5 sm:pl-6 pr-3 py-3">
                  <Checkbox checked={allSel} indeterminate={someSel && !allSel} onClick={toggleAll} />
                </th>
                {([
                  { key: "full_name"      as SortKey, label: "Klien",           sortable: true },
                  { key: "total_policies" as SortKey, label: "Polis Aktif",     sortable: true },
                  { key: "agent_name"     as SortKey, label: "Agen Pendamping", sortable: true },
                ] as Array<{ key: SortKey; label: string; sortable: boolean }>).map((h, i) => (
                  <th key={i} className="py-3 pr-4 text-left">
                    <button onClick={() => cycleSort(h.key)}
                      className={cn("group/th flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                        sort.key === h.key ? "text-black" : "text-gray-400 hover:text-gray-600")}>
                      {h.label}<SortIcon col={h.key} />
                    </button>
                  </th>
                ))}
                <th className="py-3 pr-5 sm:pr-6 w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {showBulkAssign
                        ? <UserX className="w-5 h-5 text-green-300" />
                        : <Users className="w-5 h-5 text-gray-200" />
                      }
                    </div>
                    <p className="text-sm font-semibold text-gray-400">
                      {showBulkAssign && !search
                        ? "Semua klien sudah ditugaskan"
                        : search
                        ? `Tidak ada hasil untuk "${search}"`
                        : "Belum ada klien"
                      }
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
                rows.map((client, idx) => {
                  const isSel  = selected.has(client.client_id);
                  const polPct = Math.round((client.total_policies / maxPolicies) * 100);
                  
                  const Wrapper = baseUrl ? "button" : "div";
                  const wrapperProps = baseUrl ? { 
                    onClick: () => router.push(`${baseUrl}/${client.client_id}`),
                    className: "text-sm font-semibold text-black hover:text-gray-600 truncate max-w-[180px] text-left transition-colors" 
                  } : {
                    className: "text-sm font-semibold text-black truncate max-w-[180px]"
                  };

                  return (
                    <tr key={client.client_id}
                      className={cn("group/row border-b border-gray-50 transition-colors duration-100",
                        isSel ? "bg-gray-50/50" : "hover:bg-gray-50")}
                      style={{ animationDelay: `${idx * 15}ms` }}>

                      <td className="pl-5 sm:pl-6 pr-3 py-4">
                        <Checkbox checked={isSel} onClick={() => toggleRow(client.client_id)} invisible />
                      </td>

                      {/* Client name */}
                      <td className="py-4 pr-4">
                        <Wrapper {...wrapperProps}>
                          {client.full_name}
                        </Wrapper>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-400 truncate max-w-[140px] font-mono">{client.client_id}</span>
                          {client.source === "IMPORTED" || client.source === "MIGRATED" ? (
                            <span className="text-[10px] text-gray-400 font-medium ml-1">· Import</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Policies with mini bar */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-sm font-semibold text-black tabular-nums w-5 text-right">
                              {client.total_policies}
                            </span>
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-black rounded-full transition-all duration-500"
                              style={{ width: `${polPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="py-4 pr-4">
                        {client.agent_name ? (
                          <span className="text-sm text-gray-700 truncate max-w-[160px] block">
                            {client.agent_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5">
                            <UserX className="w-3 h-3" /> Belum ditugaskan
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 pr-5 sm:pr-6 text-right">
                        <button
                          onClick={() => openReassign(client)}
                          className="opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1.5 hover:shadow-sm whitespace-nowrap"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                          {client.agent_id ? "Pindahkan" : "Tugaskan"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            {rows.length} dari {clients.length} klien
          </p>
        </div>
      </div>

      {/* ── Reassign/Assign single Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selClient?.agent_id ? "Pindahkan Klien" : "Tugaskan Klien"}</DialogTitle>
            <DialogDescription>
              {selClient?.agent_id
                ? <>Pilih agen pendamping baru untuk <strong>{selClient?.full_name}</strong>.</>
                : <>Tugaskan <strong>{selClient?.full_name}</strong> ke agen.</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selAgent} onValueChange={setSelAgent}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Pilih Agen" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name} ({a.total_policies} polis)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-gray-900 hover:bg-black text-white rounded-xl font-semibold shadow-sm"
              onClick={confirmReassign}
              disabled={processingId !== null || !selAgent}
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Assign Modal ── */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tugaskan {selected.size} Klien</DialogTitle>
            <DialogDescription>
              Pilih satu agen untuk menerima semua klien yang dipilih sekaligus.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={bulkAgent} onValueChange={setBulkAgent}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Pilih Agen" />
              </SelectTrigger>
              <SelectContent>
                {agents.map(a => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name} ({a.total_policies} polis)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl border-gray-200" onClick={() => setBulkModalOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-gray-900 hover:bg-black text-white rounded-xl font-semibold shadow-sm"
              onClick={confirmBulkAssign}
              disabled={bulkLoading || !bulkAgent}
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCheck className="w-4 h-4 mr-1.5" />}
              Tugaskan {selected.size} Klien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
