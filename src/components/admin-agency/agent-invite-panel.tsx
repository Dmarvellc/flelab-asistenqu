"use client";

/**
 * AgentInvitePanel — mounted at the top of /admin-agency/agents.
 *
 * Three agent-scoped operations live here (NOT on the Staff page):
 *   1. "Undang Agen" button → create an invitation with role='agent'
 *   2. Pending agent invitations list (revoke available)
 *   3. Agent join-requests (self-registered prospects) — accept/reject
 *
 * This panel talks to the existing `/api/admin-agency/team`,
 * `/api/admin-agency/invitations`, `/api/admin-agency/join-requests`
 * endpoints — nothing new on the server side. We just filter the
 * responses client-side to the rows that are actually about agents.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import {
  UserPlus, Send, X, Loader2, Copy, Clock, Mail, Phone, MessageSquare, Check, Trash2, UserCheck,
} from "lucide-react";

interface PendingInvitation {
  invitation_id: string;
  email: string;
  full_name: string | null;
  agency_role: string;
  expires_at: string;
  created_at: string;
  invited_by_email: string | null;
}

interface JoinRequest {
  request_id: string;
  requester_user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  message: string | null;
  created_at: string;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function AgentInvitePanel() {
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [reqProcessing, setReqProcessing] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", phone: "" });
  const [result, setResult] = useState<{ mode: "invited" | "attached"; email?: string; inviteUrl?: string; expiresAt?: string } | null>(null);
  const { run } = useBusy();

  const refresh = useCallback(async () => {
    try {
      const [iRes, jRes] = await Promise.all([
        fetch("/api/admin-agency/invitations"),
        fetch("/api/admin-agency/join-requests"),
      ]);
      if (iRes.ok) {
        const d = await iRes.json();
        setPending((d.invitations || []).filter((i: PendingInvitation) => i.agency_role === "agent"));
      }
      if (jRes.ok) {
        const d = await jRes.json();
        setJoinRequests(d.requests || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submitInvite = async () => {
    if (!form.email) return;
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, role: "agent" }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Gagal mengundang");
        if (d.mode === "invited") {
          setResult({ mode: "invited", email: d.email, inviteUrl: d.inviteUrl, expiresAt: d.expiresAt });
          toast({ title: "Undangan dibuat", description: "Salin link untuk dikirim ke agen." });
        } else {
          setResult({ mode: "attached" });
          toast({ title: "Berhasil", description: `${form.email} berhasil ditambahkan sebagai agen.` });
          setShowInvite(false);
        }
        setForm({ email: "", fullName: "", phone: "" });
        refresh();
      } catch (e) {
        toast({
          title: "Gagal",
          description: e instanceof Error ? e.message : "Gagal mengundang agen.",
          variant: "destructive",
        });
      }
    }, "Mengirim undangan…");
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Tersalin", description: "Link undangan disalin ke clipboard." });
    } catch {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    }
  };

  const handleRevoke = async (invitationId: string, email: string) => {
    if (!confirm(`Cabut undangan untuk ${email}?`)) return;
    await run(async () => {
      try {
        const res = await fetch(`/api/admin-agency/invitations?id=${invitationId}`, { method: "DELETE" });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        toast({ title: "Berhasil", description: "Undangan dicabut." });
        refresh();
      } catch (e) {
        toast({
          title: "Gagal",
          description: e instanceof Error ? e.message : "Gagal mencabut undangan.",
          variant: "destructive",
        });
      }
    }, "Mencabut undangan…");
  };

  const handleJoin = async (requestId: string, action: "accept" | "reject", label: string) => {
    if (action === "reject" && !confirm(`Tolak permintaan dari ${label}?`)) return;
    setReqProcessing(requestId);
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/join-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, action }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        toast({
          title: action === "accept" ? "Diterima" : "Ditolak",
          description:
            action === "accept"
              ? `${label} bergabung sebagai agen.`
              : `Permintaan dari ${label} ditolak.`,
        });
        refresh();
      } catch (e) {
        toast({
          title: "Gagal",
          description: e instanceof Error ? e.message : "Gagal memproses permintaan.",
          variant: "destructive",
        });
      } finally {
        setReqProcessing(null);
      }
    }, action === "accept" ? "Menerima…" : "Menolak…");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Invite CTA */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => { setShowInvite(true); setResult(null); }}
          className="bg-gray-900 hover:bg-gray-800 text-white gap-2 h-11 px-5 rounded-xl text-sm font-semibold shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Undang Agen
        </Button>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {result?.mode === "invited" ? "Undangan Siap Dikirim" : "Undang Agen Baru"}
            </h3>
            <button
              onClick={() => { setShowInvite(false); setResult(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {result?.mode === "invited" && result.inviteUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Kirim link berikut ke <span className="font-semibold text-gray-900">{result.email}</span>.
                Link berlaku sampai {result.expiresAt && fmt(result.expiresAt)}.
              </p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 font-mono break-all">
                  {result.inviteUrl}
                </div>
                <Button onClick={() => copy(result.inviteUrl!)} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5 shrink-0">
                  <Copy className="h-4 w-4" /> Salin
                </Button>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Link ini hanya muncul sekali. Salin sebelum menutup panel.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowInvite(false); setResult(null); }} className="rounded-xl">
                  Selesai
                </Button>
                <Button onClick={() => setResult(null)} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5">
                  <Send className="h-4 w-4" /> Undang Lagi
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Email *</label>
                  <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="agen@email.com" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Nama Lengkap</label>
                  <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Nama lengkap" className="rounded-xl" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">No. HP (opsional)</label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+62812..." className="rounded-xl" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Role dikunci sebagai <span className="font-semibold text-gray-700">Agen</span>. Untuk mengundang Admin/Manager, buka{" "}
                <Link href="/admin-agency/team" className="underline decoration-dotted font-semibold hover:text-violet-700">Staff Internal</Link>.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowInvite(false)} className="rounded-xl">Batal</Button>
                <Button
                  onClick={submitInvite}
                  disabled={!form.email}
                  className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
                >
                  <Send className="h-4 w-4" /> Buat Undangan
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Join Requests */}
      {joinRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-50 bg-blue-50/40 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-gray-900">Permintaan Bergabung ({joinRequests.length})</h3>
            <span className="ml-auto text-[11px] text-gray-500">Calon agen yang mendaftar mandiri</span>
          </div>
          <div className="divide-y divide-gray-50">
            {joinRequests.map(req => {
              const label = req.full_name || req.email;
              const isProc = reqProcessing === req.request_id;
              return (
                <div key={req.request_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-sm font-bold text-blue-700">
                      {label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {req.email}
                        </span>
                        {req.phone_number && (
                          <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3 shrink-0" /> {req.phone_number}
                          </span>
                        )}
                      </div>
                      {req.message && (
                        <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 mt-1.5 flex items-start gap-1.5">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                          {req.message}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">Dikirim {fmt(req.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button onClick={() => handleJoin(req.request_id, "reject", label)} variant="outline" size="sm" disabled={isProc} className="rounded-xl gap-1.5 text-xs">
                      <X className="h-3.5 w-3.5" /> Tolak
                    </Button>
                    <Button onClick={() => handleJoin(req.request_id, "accept", label)} size="sm" disabled={isProc} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5 text-xs">
                      {isProc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Terima
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending agent invitations */}
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-50 bg-amber-50/30 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900">Undangan Agen Pending ({pending.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.map(inv => (
              <div key={inv.invitation_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inv.full_name || inv.email}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3" /> {inv.email}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Kedaluwarsa {fmt(inv.expires_at)}
                    {inv.invited_by_email && ` · oleh ${inv.invited_by_email}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(inv.invitation_id, inv.email)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  title="Cabut undangan"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
