"use client";

import { useEffect, useState } from "react";
import {
  Users, UserPlus, Shield, Star, Crown, Loader2, AlertCircle, MoreVertical,
  Mail, Phone, ChevronDown, X, Check, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

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

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", role: "agent", password: "" });
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-agency/team");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      toast({ title: "Error", description: "Gagal memuat data tim.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      const res = await fetch("/api/admin-agency/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");
      toast({ title: "Berhasil", description: `${inviteForm.email} berhasil ditambahkan.` });
      setShowInvite(false);
      setInviteForm({ email: "", fullName: "", role: "agent", password: "" });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan anggota.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string) => {
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
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui role.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Hapus ${name} dari tim?`)) return;
    try {
      const res = await fetch(`/api/admin-agency/team?memberId=${memberId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast({ title: "Berhasil", description: "Anggota berhasil dihapus." });
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus anggota.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
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
      fetchTeam();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-2">
            <Users className="h-4 w-4" />
            Manajemen Tim
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900">Tim Agensi</h1>
          <p className="text-base text-gray-500 mt-1">Kelola anggota tim, role, dan akses dashboard.</p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white gap-2 h-12 px-6 rounded-2xl text-sm font-semibold shadow-md"
        >
          <UserPlus className="h-4 w-4" />
          Tambah Anggota
        </Button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Tambah Anggota Baru</h3>
            <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
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
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Role *</label>
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white"
              >
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="master_admin">Master Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 block">Password Awal</label>
              <Input
                value={inviteForm.password}
                onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Default: Welcome123!"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowInvite(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email} className="bg-gray-900 hover:bg-gray-800 rounded-xl gap-2">
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Tambah
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const count = members.filter(m => m.member_role === key).length;
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

      {/* Team List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
          <h3 className="text-sm font-bold text-gray-900">Anggota Tim ({members.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="font-semibold text-gray-700">Belum ada anggota</p>
              <p className="text-sm text-gray-500 mt-1">Tambahkan anggota tim pertama Anda.</p>
            </div>
          ) : (
            members.map(m => {
              const roleConfig = ROLE_CONFIG[m.member_role] || ROLE_CONFIG.agent;
              const statusConfig = STATUS_CONFIG[m.member_status] || STATUS_CONFIG.ACTIVE;
              const RoleIcon = roleConfig.icon;
              const isEditing = editingId === m.member_id;

              return (
                <div key={m.member_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-sm font-bold text-gray-600">
                    {(m.full_name || m.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.full_name || m.email}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {m.email}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="hidden sm:flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                        >
                          <option value="agent">Agent</option>
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

                  {/* Status */}
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
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
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
