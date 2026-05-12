"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useBusy } from "@/components/ui/busy-overlay-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  UserPlus, Send, Loader2, Copy, Clock, Mail, Phone, MessageSquare, Check, Trash2, UserCheck,
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

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", phone: "" });
  const [inviteResult, setInviteResult] = useState<{ email?: string; inviteUrl?: string; expiresAt?: string } | null>(null);

  // Revoke confirm dialog
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(null);

  // Reject join request confirm dialog
  const [rejectTarget, setRejectTarget] = useState<JoinRequest | null>(null);

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
          setInviteResult({ email: d.email, inviteUrl: d.inviteUrl, expiresAt: d.expiresAt });
          toast({ title: "Undangan dibuat", description: "Salin link untuk dikirim ke agen." });
        } else {
          toast({ title: "Berhasil", description: `${form.email} berhasil ditambahkan sebagai agen.` });
          setInviteOpen(false);
          setForm({ email: "", fullName: "", phone: "" });
        }
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

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const inv = revokeTarget;
    setRevokeTarget(null);
    await run(async () => {
      try {
        const res = await fetch(`/api/admin-agency/invitations?id=${inv.invitation_id}`, { method: "DELETE" });
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

  const handleAccept = async (req: JoinRequest) => {
    setReqProcessing(req.request_id);
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/join-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: req.request_id, action: "accept" }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        toast({ title: "Diterima", description: `${req.full_name || req.email} bergabung sebagai agen.` });
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
    }, "Menerima…");
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const req = rejectTarget;
    setRejectTarget(null);
    setReqProcessing(req.request_id);
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/join-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: req.request_id, action: "reject" }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        toast({ title: "Ditolak", description: `Permintaan dari ${req.full_name || req.email} ditolak.` });
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
    }, "Menolak…");
  };

  return (
    <>
      {/* ── Invite Agent Dialog ───────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={(open) => {
        setInviteOpen(open);
        if (!open) { setForm({ email: "", fullName: "", phone: "" }); setInviteResult(null); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inviteResult ? "Undangan Siap Dikirim" : "Undang Agen Baru"}
            </DialogTitle>
            {!inviteResult && (
              <DialogDescription>
                Role dikunci sebagai <strong>Agen</strong>. Untuk mengundang Admin/Manager, buka{" "}
                <Link href="/admin-agency/team" className="underline decoration-dotted font-semibold">
                  Staff Internal
                </Link>.
              </DialogDescription>
            )}
          </DialogHeader>

          {inviteResult ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Kirim link berikut ke <span className="font-semibold text-gray-900">{inviteResult.email}</span>.
                {inviteResult.expiresAt && ` Berlaku sampai ${fmt(inviteResult.expiresAt)}.`}
              </p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-700 break-all font-mono">
                  {inviteResult.inviteUrl}
                </div>
                <Button
                  onClick={() => copy(inviteResult.inviteUrl!)}
                  variant="outline"
                  className="shrink-0 gap-1.5"
                >
                  <Copy className="h-4 w-4" /> Salin
                </Button>
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Link ini hanya muncul sekali. Salin sebelum menutup dialog.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteResult(null)} className="gap-1.5">
                  <Send className="h-4 w-4" /> Undang Lagi
                </Button>
                <Button onClick={() => { setInviteOpen(false); setInviteResult(null); }}>
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">Email *</label>
                  <Input
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="agen@email.com"
                    type="email"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">Nama Lengkap</label>
                  <Input
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Nama lengkap"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-700 mb-1.5 block">No. HP (opsional)</label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+62812…"
                    type="tel"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Batal</Button>
                <Button onClick={submitInvite} disabled={!form.email} className="gap-1.5">
                  <Send className="h-4 w-4" /> Buat Undangan
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation Dialog ────────────────────── */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cabut Undangan</DialogTitle>
            <DialogDescription>
              Cabut undangan untuk <strong>{revokeTarget?.full_name || revokeTarget?.email}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleRevoke}>Cabut Undangan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Confirmation Dialog ────────────────────── */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
            <DialogDescription>
              Tolak permintaan bergabung dari <strong>{rejectTarget?.full_name || rejectTarget?.email}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleReject}>Tolak</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Page Content ──────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Invite CTA */}
        <div className="flex items-center justify-end">
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Undang Agen
          </Button>
        </div>

        {/* Join Requests */}
        {joinRequests.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Permintaan Bergabung</h3>
              <span className="ml-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                {joinRequests.length}
              </span>
              <span className="ml-auto text-xs text-gray-400">Calon agen yang mendaftar mandiri</span>
            </div>
            <div className="divide-y divide-gray-100">
              {joinRequests.map(req => {
                const isProc = reqProcessing === req.request_id;
                return (
                  <div key={req.request_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{req.full_name || req.email}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-0.5">
                        <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {req.email}
                        </span>
                        {req.phone_number && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <Phone className="h-3 w-3 shrink-0" /> {req.phone_number}
                          </span>
                        )}
                      </div>
                      {req.message && (
                        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 mt-1.5 flex items-start gap-1.5">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                          {req.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Dikirim {fmt(req.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        onClick={() => setRejectTarget(req)}
                        variant="outline"
                        size="sm"
                        disabled={isProc}
                        className="gap-1.5 text-xs"
                      >
                        Tolak
                      </Button>
                      <Button
                        onClick={() => handleAccept(req)}
                        size="sm"
                        disabled={isProc}
                        className="gap-1.5 text-xs"
                      >
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Undangan Agen Pending</h3>
              <span className="ml-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {pending.map(inv => (
                <div key={inv.invitation_id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{inv.full_name || inv.email}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" /> {inv.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Kedaluwarsa {fmt(inv.expires_at)}
                      {inv.invited_by_email && ` · oleh ${inv.invited_by_email}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeTarget(inv)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
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
    </>
  );
}
