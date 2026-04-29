"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Crown, Shield, Star, Users, UserCircle2, Building2,
  ChevronDown, ChevronRight, Mail, Phone, Calendar,
  Clock, Loader2, RefreshCw, UserPlus, AlertCircle,
  CheckCircle2, XCircle, TrendingUp, Briefcase, Network,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrgMember {
  member_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  member_role: "master_admin" | "admin" | "manager" | "agent";
  member_status: string;
  joined_at: string | null;
  created_at: string;
  total_clients: number;
  total_active_contracts: number;
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

interface OrgAgency {
  agency_id: string;
  name: string;
  slug: string | null;
  status: string;
  created_at: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface OrgStats {
  total_members: number;
  total_master_admin: number;
  total_admin: number;
  total_manager: number;
  total_agent: number;
  total_clients: number;
  total_active_contracts: number;
  pending_invitations: number;
}

interface OrgData {
  agency: OrgAgency;
  stats: OrgStats;
  members: OrgMember[];
  pending_invitations: PendingInvitation[];
}

// ─── Role config ─────────────────────────────────────────────────────────────

const ROLE_CFG = {
  master_admin: {
    label: "Master Admin",
    icon: Crown,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
    ring: "ring-amber-300",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-800 border-blue-300",
    dot: "bg-blue-500",
    ring: "ring-blue-300",
  },
  manager: {
    label: "Manager",
    icon: Star,
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    badge: "bg-purple-100 text-purple-800 border-purple-300",
    dot: "bg-purple-500",
    ring: "ring-purple-300",
  },
  agent: {
    label: "Agen",
    icon: Users,
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-700 border-gray-300",
    dot: "bg-gray-400",
    ring: "ring-gray-300",
  },
} as const;

const INVITE_ROLE_CFG: Record<string, { label: string; badge: string }> = {
  master_admin: { label: "Master Admin", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  admin: { label: "Admin", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  manager: { label: "Manager", badge: "bg-purple-100 text-purple-800 border-purple-300" },
  agent: { label: "Agen", badge: "bg-gray-100 text-gray-700 border-gray-300" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDatetime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  name,
  email,
  role,
  size = "md",
}: {
  name: string | null;
  email: string;
  role: keyof typeof ROLE_CFG;
  size?: "sm" | "md" | "lg";
}) {
  const cfg = ROLE_CFG[role];
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return (
    <div className={`${sizeClass} rounded-full ${cfg.bg} ${cfg.border} border-2 ${cfg.ring} ring-2 ring-offset-1 flex items-center justify-center font-bold ${cfg.text} shrink-0`}>
      {initials(name, email)}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Member Card ─────────────────────────────────────────────────────────────

function MemberCard({
  member,
  depth = 0,
  isLast = false,
}: {
  member: OrgMember;
  depth?: number;
  isLast?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ROLE_CFG[member.member_role];
  const RoleIcon = cfg.icon;

  return (
    <div className="relative">
      {/* Vertical connector line from parent */}
      {depth > 0 && (
        <div
          className={`absolute left-0 top-0 w-px bg-gray-200 ${isLast ? "h-6" : "h-full"}`}
          style={{ left: depth * 24 - 13 }}
        />
      )}
      {/* Horizontal connector */}
      {depth > 0 && (
        <div
          className="absolute top-6 h-px bg-gray-200"
          style={{ left: depth * 24 - 13, width: 13 }}
        />
      )}

      <div
        className={`ml-[${depth * 24}px] mb-2`}
        style={{ marginLeft: depth * 24 }}
      >
        <div
          className={`border ${cfg.border} ${cfg.bg} rounded-2xl p-4 transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-start gap-3">
            <Avatar name={member.full_name} email={member.email} role={member.member_role} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {member.full_name || member.email}
                </p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                  <RoleIcon className="h-3 w-3" />
                  {cfg.label}
                </span>
                {member.member_status !== "ACTIVE" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                    {member.member_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{member.email}</p>

              {/* Quick stats */}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  {member.total_clients} klien
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                  {member.total_active_contracts} kontrak aktif
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  Bergabung {fmtDate(member.joined_at || member.created_at)}
                </span>
              </div>
            </div>

            {/* Expand toggle for detail */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-400 hover:text-gray-700 mt-1 shrink-0"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone_number && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{member.phone_number}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>Bergabung: {fmtDatetime(member.joined_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>ID: {member.user_id.slice(0, 8)}…</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Role Group ──────────────────────────────────────────────────────────────

function RoleGroup({
  role,
  members,
  depth = 0,
}: {
  role: keyof typeof ROLE_CFG;
  members: OrgMember[];
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const cfg = ROLE_CFG[role];
  const RoleIcon = cfg.icon;

  if (members.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 mb-2 group"
        style={{ marginLeft: depth * 24 }}
      >
        <div className={`h-6 w-6 rounded-lg ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
          <RoleIcon className={`h-3.5 w-3.5 ${cfg.text}`} />
        </div>
        <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
          {cfg.label}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge} border`}>
          {members.length}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600" />
        )}
      </button>
      {open && (
        <div>
          {members.map((m, i) => (
            <MemberCard key={m.member_id} member={m} depth={depth} isLast={i === members.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pending Invitation Card ─────────────────────────────────────────────────

function InviteCard({ invite }: { invite: PendingInvitation }) {
  const cfg = INVITE_ROLE_CFG[invite.agency_role] ?? INVITE_ROLE_CFG.agent;
  const days = daysUntil(invite.expires_at);
  const urgent = days <= 1;

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-dashed border-amber-200 hover:border-amber-300 transition-colors">
      <div className="h-10 w-10 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center shrink-0">
        <UserPlus className="h-5 w-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {invite.full_name || invite.email}
          </p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate">{invite.email}</p>
        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className={`h-3.5 w-3.5 ${urgent ? "text-red-500" : "text-amber-500"}`} />
            <span className={urgent ? "text-red-600 font-semibold" : ""}>
              {days === 0 ? "Kedaluwarsa hari ini" : `${days} hari lagi`}
            </span>
          </span>
          {invite.invited_by_email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              Diundang oleh {invite.invited_by_email}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            {fmtDate(invite.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Agency Header ───────────────────────────────────────────────────────────

function AgencyHeader({ agency }: { agency: OrgAgency }) {
  const statusColor =
    agency.status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : agency.status === "SUSPENDED"
      ? "bg-red-100 text-red-800 border-red-300"
      : "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-xl shadow-inner"
        style={{
          background: agency.primary_color
            ? `linear-gradient(135deg, ${agency.primary_color}, ${agency.primary_color}cc)`
            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
        }}
      >
        {agency.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-gray-900">{agency.name}</h1>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
            {agency.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {agency.slug && (
            <span className="flex items-center gap-1">
              <Network className="h-3.5 w-3.5 text-gray-400" />
              /{agency.slug}/agent
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            Dibuat {fmtDate(agency.created_at)}
          </span>
          <span className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-gray-400" />
            ID: {agency.agency_id.slice(0, 8)}…
          </span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href="/admin-agency/team"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Kelola Tim
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-agency/organization", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal memuat data");
      }
      setData(await res.json());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat organisasi";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600 font-medium">{error ?? "Data tidak tersedia"}</p>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  const { agency, stats, members, pending_invitations } = data;

  const byRole = {
    master_admin: members.filter((m) => m.member_role === "master_admin"),
    admin: members.filter((m) => m.member_role === "admin"),
    manager: members.filter((m) => m.member_role === "manager"),
    agent: members.filter((m) => m.member_role === "agent"),
  };

  const masterAdmin = byRole.master_admin[0] ?? null;
  const hasMasterAdmin = byRole.master_admin.length > 0;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 w-full pb-12">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Organisasi Agensi
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-2xl">
            Hierarki lengkap anggota, peran, dan struktur agensi Anda.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Agency Header */}
      <AgencyHeader agency={agency} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Anggota" value={stats.total_members} icon={Users} color="bg-gray-700" />
        <StatCard label="Total Klien" value={stats.total_clients} icon={Briefcase} color="bg-indigo-500" />
        <StatCard label="Kontrak Aktif" value={stats.total_active_contracts} icon={TrendingUp} color="bg-emerald-500" />
        <StatCard label="Undangan Pending" value={stats.pending_invitations} icon={UserPlus} color="bg-amber-500" />
      </div>

      {/* Role Summary Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Komposisi Peran</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["master_admin", "admin", "manager", "agent"] as const).map((role) => {
            const cfg = ROLE_CFG[role];
            const RoleIcon = cfg.icon;
            const count = byRole[role].length;
            return (
              <div key={role} className={`flex items-center gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                <div className={`h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <RoleIcon className={`h-4 w-4 ${cfg.text}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${cfg.text}`}>{count}</p>
                  <p className={`text-[10px] font-semibold ${cfg.text} opacity-80`}>{cfg.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Admin status notice */}
      {!hasMasterAdmin && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Belum Ada Master Admin</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Agensi ini belum memiliki Master Admin. Pergi ke{" "}
              <Link href="/admin-agency/team" className="underline font-semibold">
                Kelola Tim
              </Link>{" "}
              untuk menetapkan satu.
            </p>
          </div>
        </div>
      )}
      {hasMasterAdmin && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Master Admin Aktif</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {masterAdmin!.full_name || masterAdmin!.email} memegang kendali penuh atas agensi ini.
              Tidak dapat mengundang Master Admin lain selama peran ini sudah terisi.
            </p>
          </div>
        </div>
      )}

      {/* Organization Tree */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Network className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Pohon Hierarki</h2>
            <p className="text-xs text-gray-500">Struktur organisasi dari atas ke bawah</p>
          </div>
        </div>
        <div className="p-6">
          {members.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">Belum ada anggota aktif</p>
              <Link
                href="/admin-agency/team"
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                + Tambah anggota pertama
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Master Admin level */}
              <RoleGroup role="master_admin" members={byRole.master_admin} depth={0} />

              {/* Vertical connector */}
              {hasMasterAdmin && (byRole.admin.length > 0 || byRole.manager.length > 0 || byRole.agent.length > 0) && (
                <div className="flex items-center gap-2 ml-5 my-1">
                  <div className="w-px h-5 bg-gray-200" />
                  <ChevronDown className="h-3 w-3 text-gray-300 -ml-1.5" />
                </div>
              )}

              {/* Admin level */}
              <RoleGroup role="admin" members={byRole.admin} depth={1} />

              {byRole.admin.length > 0 && (byRole.manager.length > 0 || byRole.agent.length > 0) && (
                <div className="flex items-center gap-2 ml-9 my-1">
                  <div className="w-px h-5 bg-gray-200" />
                  <ChevronDown className="h-3 w-3 text-gray-300 -ml-1.5" />
                </div>
              )}

              {/* Manager level */}
              <RoleGroup role="manager" members={byRole.manager} depth={2} />

              {byRole.manager.length > 0 && byRole.agent.length > 0 && (
                <div className="flex items-center gap-2 ml-[52px] my-1">
                  <div className="w-px h-5 bg-gray-200" />
                  <ChevronDown className="h-3 w-3 text-gray-300 -ml-1.5" />
                </div>
              )}

              {/* Agent level */}
              <RoleGroup role="agent" members={byRole.agent} depth={byRole.manager.length > 0 ? 3 : byRole.admin.length > 0 ? 2 : 1} />
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {pending_invitations.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Undangan Tertunda</h2>
                <p className="text-xs text-gray-500">{pending_invitations.length} undangan belum diterima</p>
              </div>
            </div>
            <Link
              href="/admin-agency/team"
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Kelola →
            </Link>
          </div>
          <div className="p-6 grid gap-3 sm:grid-cols-2">
            {pending_invitations.map((invite) => (
              <InviteCard key={invite.invitation_id} invite={invite} />
            ))}
          </div>
        </div>
      )}

      {/* All Members Detail Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Semua Anggota</h2>
            <p className="text-xs text-gray-500">{members.length} anggota aktif</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Anggota</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Peran</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Klien</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kontrak Aktif</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bergabung</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((m) => {
                const cfg = ROLE_CFG[m.member_role];
                const RoleIcon = cfg.icon;
                return (
                  <tr key={m.member_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name} email={m.email} role={m.member_role} size="sm" />
                        <div>
                          <p className="font-semibold text-gray-900">{m.full_name || "—"}</p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                        <RoleIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-semibold text-gray-700">{m.total_clients}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-semibold text-emerald-700">{m.total_active_contracts}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {fmtDate(m.joined_at || m.created_at)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {m.member_status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <XCircle className="h-3 w-3" /> {m.member_status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Keterangan Peran</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <Crown className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Master Admin</p>
              <p>Kendali penuh atas agensi — hanya 1 per agensi. Tidak bisa dihapus.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Admin</p>
              <p>Dapat mengelola anggota, klien, dan klaim. Tidak bisa mengubah Master Admin.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Star className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Manager</p>
              <p>Supervisi tim agen, memantau performa. Akses portal agent.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Agen</p>
              <p>Mengelola klien dan kontrak asuransi langsung. Akses portal agent.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
