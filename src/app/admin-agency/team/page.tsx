"use client";

import { useEffect, useState } from "react";
import {
  Users, UserPlus, UserCog, Shield, Star, Crown, Loader2, Mail, X, Check,
  Trash2, Link2, Copy, Clock, Send, UserCheck,
} from "lucide-react";
import { TeamPageSkeleton } from "@/components/ui/dashboard-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useBusy } from "@/components/ui/busy-overlay-provider";

interface TeamMember {
  member_id: string;
  member_role: string;
  member_status: string;
  permissions: string[] | null;
  joined_at: string;
  user_id: string;
  email: string;
  system_role: string;
  user_status: string;
  full_name: string | null;
  phone_number: string | null;
}

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

interface InviteResult {
  mode: "invited" | "attached";
  email?: string;
  inviteUrl?: string;
  expiresAt?: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  master_admin: { label: "Master Admin", icon: Crown, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  manager: { label: "Manager", icon: Star, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  agent: { label: "Agent", icon: Users, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Aktif", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  INVITED: { label: "Diundang", color: "text-amber-700 bg-amber-50 border-amber-200" },
  SUSPENDED: { label: "Nonaktif", color: "text-red-700 bg-red-50 border-red-200" },
  PENDING: { label: "Menunggu", color: "text-amber-700 bg-amber-50 border-amber-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<PendingInvitation[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", phone: "", role: "manager" });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const { run } = useBusy();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [tRes, iRes, jRes] = await Promise.all([
        fetch("/api/admin-agency/team"),
        fetch("/api/admin-agency/invitations"),
        fetch("/api/admin-agency/join-requests"),
      ]);
      if (!tRes.ok) throw new Error("Failed to fetch team");
      const tData = await tRes.json();
      setMembers(tData.members || []);
      if (iRes.ok) {
        const iData = await iRes.json();
        setPending(iData.invitations || []);
      }
      if (jRes.ok) {
        const jData = await jRes.json();
        setJoinRequests(jData.requests || []);
      }
    } catch {
      toast({ title: "Error", description: "Gagal memuat data tim.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    await run(async () => {
    try {
      const res = await fetch("/api/admin-agency/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");

      if (data.mode === "invited") {
        setInviteResult({
          mode: "invited",
          email: data.email,
          inviteUrl: data.inviteUrl,
          expiresAt: data.expiresAt,
        });
        toast({ title: "Undangan dibuat", description: "Salin link untuk dikirim ke anggota." });
      } else {
        setInviteResult({ mode: "attached" });
        toast({ title: "Berhasil", description: `${inviteForm.email} berhasil ditambahkan.` });
        setShowInvite(false);
      }
      setInviteForm({ email: "", fullName: "", phone: "", role: "manager" });
      fetchAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan anggota.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setInviting(false);
    }
    }, "Mengirim undangan…");
  };

  const copyInviteUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Tersalin", description: "Link undangan tersalin ke clipboard." });
    } catch {
      toast({ title: "Gagal menyalin", description: "Salin manual dari kolom di atas.", variant: "destructive" });
    }
  };

  // Join-request handling lives on /admin-agency/agents now — join
  // requests are always agent-scoped.

  const handleRevoke = async (invitationId: string, email: string) => {
    if (!confirm(`Cabut undangan untuk ${email}?`)) return;
    await run(async () => {
      try {
        const res = await fetch(`/api/admin-agency/invitations?id=${invitationId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast({ title: "Berhasil", description: "Undangan dicabut." });
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mencabut undangan.";
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    }, "Mencabut undangan…");
  };

  const handleUpdateRole = async (memberId: string) => {
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, role: editRole }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast({ title: "Berhasil", description: "Role berhasil diperbarui." });
        setEditingId(null);
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui role.";
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    }, "Memperbarui role…");
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Hapus ${name} dari tim?`)) return;
    await run(async () => {
      try {
        const res = await fetch(`/api/admin-agency/team?memberId=${memberId}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast({ title: "Berhasil", description: "Anggota berhasil dihapus." });
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menghapus anggota.";
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    }, "Menghapus anggota…");
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    await run(async () => {
      try {
        const res = await fetch("/api/admin-agency/team", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, status: newStatus }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        toast({ title: "Berhasil", description: `Status berhasil diubah ke ${newStatus}.` });
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengubah status.";
        toast({ title: "Gagal", description: msg, variant: "destructive" });
      }
    }, "Mengubah status…");
  };

  if (loading) {
    return <TeamPageSkeleton />;
  }

  // This page is scoped to internal staff only. Agent-facing rows
  // (members with role=agent, pending agent invites, agent join requests)
  // live on /admin-agency/agents.
  const staffMembers = members.filter((m) => m.member_role !== "agent");
  const staffPending = pending.filter((i) => i.agency_role !== "agent");

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Master Admin, Admin &amp; Manager
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xl">
            Kelola operator internal agensi Anda. Untuk mengundang <span className="font-semibold text-gray-700">agen baru</span>,
            buka halaman{" "}
            <Link
              href="/admin-agency/agents"
              className="text-gray-900 underline decoration-dotted underline-offset-2 font-semibold hover:text-violet-700"
            >
              Agen
            </Link>.
          </p>
        </div>
        <Button
          onClick={() => { setShowInvite(true); setInviteResult(null); }}
          className="bg-gray-900 hover:bg-gray-800 text-white gap-2 h-11 px-5 rounded-xl text-sm font-semibold shadow-sm shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Undang Staff
        </Button>
      </div>

      {/* Invite Modal / Panel */}
      {showInvite && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {inviteResult?.mode === "invited" ? "Undangan Siap Dikirim" : "Undang Anggota Baru"}
            </h3>
            <button
              onClick={() => { setShowInvite(false); setInviteResult(null); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {inviteResult?.mode === "invited" && inviteResult.inviteUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Kirim link berikut ke <span className="font-semibold text-gray-900">{inviteResult.email}</span>{" "}
                via WhatsApp / email. Link berlaku sampai{" "}
                {inviteResult.expiresAt && formatDate(inviteResult.expiresAt)}.
              </p>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 break-all">
                  {inviteResult.inviteUrl}
                </div>
                <Button
                  onClick={() => copyInviteUrl(inviteResult.inviteUrl!)}
                  className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  Salin
                </Button>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Link ini hanya muncul sekali. Pastikan Anda salin sebelum menutup panel ini.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowInvite(false); setInviteResult(null); }}
                  className="rounded-xl"
                >
                  Selesai
                </Button>
                <Button
                  onClick={() => setInviteResult(null)}
                  className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Undang Lagi
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Email *</label>
                  <Input
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="nama@email.com"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Nama Lengkap</label>
                  <Input
                    value={inviteForm.fullName}
                    onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                    placeholder="Nama lengkap"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">No. HP (opsional)</label>
                  <Input
                    value={inviteForm.phone}
                    onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    placeholder="+62812..."
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Role *</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="master_admin">Master Admin</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3 flex items-start gap-1.5">
                <Link2 className="h-3 w-3 mt-0.5 shrink-0" />
                Kami akan membuat link undangan. Penerima mengklik link untuk mengatur password sendiri. Anda tidak perlu menentukan password di sini.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowInvite(false)} className="rounded-xl">Batal</Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.email}
                  className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Buat Undangan
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Stats — only staff roles */}
      <div className="grid grid-cols-3 gap-3">
        {(["master_admin", "admin", "manager"] as const).map((key) => {
          const cfg = ROLE_CONFIG[key];
          const count = staffMembers.filter(m => m.member_role === key).length;
          const Icon = cfg.icon;
          return (
            <div key={key} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg} border`}>
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{count}</p>
                <p className="text-[10px] text-gray-500 font-medium">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to agent self-registrations (lives on /agents) */}
      {joinRequests.length > 0 && (
        <Link
          href="/admin-agency/agents"
          className="flex items-center gap-3 px-5 py-4 bg-blue-50/60 border border-blue-100 rounded-2xl hover:bg-blue-50 transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0">
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {joinRequests.length} calon agen menunggu persetujuan
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Permintaan bergabung agen ditangani di halaman Agen.
            </p>
          </div>
        </Link>
      )}
      {/* Pending staff invitations */}
      {staffPending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-50 bg-amber-50/30 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-gray-900">Undangan Pending ({staffPending.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {staffPending.map(inv => {
              const roleCfg = ROLE_CONFIG[inv.agency_role] || ROLE_CONFIG.agent;
              return (
                <div
                  key={inv.invitation_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {inv.full_name || inv.email}
                    </p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" /> {inv.email}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Kedaluwarsa {formatDate(inv.expires_at)}
                      {inv.invited_by_email && ` · oleh ${inv.invited_by_email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${roleCfg.bg} ${roleCfg.color}`}
                    >
                      {roleCfg.label}
                    </span>
                    <button
                      onClick={() => handleRevoke(inv.invitation_id, inv.email)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="Cabut undangan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-50 bg-gray-50/30">
          <h3 className="text-sm font-bold text-gray-900">Daftar Staff ({staffMembers.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {staffMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserCog className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Belum ada staff internal</p>
              <p className="text-sm text-gray-500 mt-1">Undang Admin atau Manager pertama Anda.</p>
            </div>
          ) : (
            staffMembers.map(m => {
              const roleConfig = ROLE_CONFIG[m.member_role] || ROLE_CONFIG.agent;
              const statusConfig = STATUS_CONFIG[m.member_status] || STATUS_CONFIG.ACTIVE;
              const RoleIcon = roleConfig.icon;
              const isEditing = editingId === m.member_id;

              return (
                <div key={m.member_id} className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.full_name || m.email}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {m.email}
                    </p>
                    {/* Role + status (mobile) */}
                    <div className="flex sm:hidden items-center gap-1.5 mt-1.5">
                      <span className={`flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${roleConfig.bg} ${roleConfig.color}`}>
                        <RoleIcon className="h-2.5 w-2.5" />
                        {roleConfig.label}
                      </span>
                      <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Role Badge (desktop) */}
                  <div className="hidden sm:flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="master_admin">Master Admin</option>
                        </select>
                        <button onClick={() => handleUpdateRole(m.member_id)} className="text-emerald-600 hover:text-emerald-700 p-1">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(m.member_id); setEditRole(m.member_role); }}
                        className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${roleConfig.bg} ${roleConfig.color} hover:opacity-80 transition-opacity`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleConfig.label}
                      </button>
                    )}
                  </div>

                  {/* Status (desktop) */}
                  <button
                    onClick={() => handleToggleStatus(m.member_id, m.member_status)}
                    className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${statusConfig.color} hover:opacity-80 transition-opacity hidden sm:block`}
                  >
                    {statusConfig.label}
                  </button>

                  {/* Actions */}
                  {m.member_role !== "master_admin" && (
                    <button
                      onClick={() => handleRemove(m.member_id, m.full_name || m.email)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
