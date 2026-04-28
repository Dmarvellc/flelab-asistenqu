"use client";

import { useState, useMemo, useRef } from "react";
import { AgencyAgent, AgencyClient } from "@/services/admin-agency";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  X, Check, ArrowRight, Users, UserCog, Shield,
  Download, Trash2, Loader2,
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

interface Props { clients: AgencyClient[]; agents: AgencyAgent[] }

export function ClientsTable({ clients: initialClients, agents }: Props) {
  const [clients,      setClients]      = useState(initialClients);
  const [search,       setSearch]       = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [sort,         setSort]         = useState<{ key: SortKey; dir: SortDir }>({ key: "full_name", dir: "asc" });
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [selClient,    setSelClient]    = useState<AgencyClient | null>(null);
  const [selAgent,     setSelAgent]     = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const maxPolicies = useMemo(() => Math.max(...clients.map(c => c.total_policies), 1), [clients]);

  const rows = useMemo(() => {
    let r = [...clients];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.agent_name.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      const [av, bv] =
        sort.key === "total_policies" ? [a.total_policies, b.total_policies] :
        sort.key === "agent_name"     ? [a.agent_name, b.agent_name] :
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
    setSelAgent(client.agent_id);
    setModalOpen(true);
  };

  const confirmReassign = async () => {
    if (!selClient || !selAgent || selAgent === selClient.agent_id) { setModalOpen(false); return; }
    setProcessingId(selClient.client_id);
    try {
      const res = await fetch("/api/admin-agency/clients/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selClient.client_id, newAgentId: selAgent }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const newName = agents.find(a => a.user_id === selAgent)?.full_name || "—";
      setClients(prev => prev.map(c =>
        c.client_id === selClient.client_id ? { ...c, agent_id: selAgent, agent_name: newName } : c
      ));
      toast({ title: "Berhasil", description: "Klien berhasil dipindahkan." });
      setModalOpen(false);
    } catch (err) {
      toast({ title: "Gagal", description: err instanceof Error ? err.message : "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setProcessingId(null);
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

  return (
    <>
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
              <p className="text-sm font-bold text-gray-900">Direktori Klien</p>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 tabular-nums">
                {clients.length}
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
                  placeholder="Cari klien…"
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
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                <th className="w-10 pl-5 sm:pl-6 pr-3 py-2.5">
                  <Checkbox checked={allSel} indeterminate={someSel && !allSel} onClick={toggleAll} />
                </th>
                {([
                  { key: "full_name" as SortKey,      label: "Klien",          sortable: true  },
                  { key: "total_policies" as SortKey,  label: "Polis Aktif",    sortable: true  },
                  { key: "agent_name" as SortKey,      label: "Agen Pendamping",sortable: true  },
                ] as Array<{ key: SortKey; label: string; sortable: boolean }>).map((h, i) => (
                  <th key={i} className="py-2.5 pr-4 text-left">
                    <button onClick={() => cycleSort(h.key)}
                      className={cn("group/th flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        sort.key === h.key ? "text-gray-800" : "text-gray-400 hover:text-gray-600")}>
                      {h.label}<SortIcon col={h.key} />
                    </button>
                  </th>
                ))}
                <th className="py-2.5 pr-5 sm:pr-6 w-16" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-200" />
                    </div>
                    <p className="text-sm font-semibold text-gray-400">
                      {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada klien"}
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
                  const isSel    = selected.has(client.client_id);
                  const polPct   = Math.round((client.total_policies / maxPolicies) * 100);
                  return (
                    <tr key={client.client_id}
                      className={cn("group/row border-b border-gray-50 last:border-0 transition-colors duration-100",
                        isSel ? "bg-blue-50/30" : "hover:bg-gray-50/70")}
                      style={{ animationDelay: `${idx * 25}ms` }}>

                      <td className="pl-5 sm:pl-6 pr-3 py-3.5">
                        <Checkbox checked={isSel} onClick={() => toggleRow(client.client_id)} invisible />
                      </td>

                      {/* Client */}
                      <td className="py-3.5 pr-4">
                        <p className="text-[13px] font-semibold text-gray-900 truncate max-w-[180px]">{client.full_name}</p>
                      </td>

                      {/* Policies with mini bar */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex items-center gap-1 shrink-0">
                            <Shield className="w-3 h-3 text-gray-300" />
                            <span className="text-[13px] font-bold text-gray-900 tabular-nums w-5 text-right">{client.total_policies}</span>
                          </div>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-900 rounded-full transition-all duration-500"
                              style={{ width: `${polPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="py-3.5 pr-4">
                        <span className="text-[13px] text-gray-600 truncate max-w-[160px]">{client.agent_name}</span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 pr-5 sm:pr-6">
                        <button
                          onClick={() => openReassign(client)}
                          className="opacity-0 group-hover/row:opacity-100 translate-x-1.5 group-hover/row:translate-x-0 transition-all duration-150 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-2.5 py-1 hover:shadow-sm whitespace-nowrap"
                        >
                          <UserCog className="w-3 h-3" />
                          Pindahkan
                          <ArrowRight className="w-3 h-3" />
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
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-gray-50 bg-gray-50/30">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-gray-600 tabular-nums">{rows.length}</span> dari{" "}
            <span className="font-semibold text-gray-600 tabular-nums">{clients.length}</span> klien
          </p>
        </div>
      </div>

      {/* ── Reassign Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pindahkan Klien</DialogTitle>
            <DialogDescription>
              Pilih agen pendamping baru untuk <strong>{selClient?.full_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selAgent} onValueChange={setSelAgent}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Pilih Agen Baru" />
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
              disabled={processingId !== null}
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
