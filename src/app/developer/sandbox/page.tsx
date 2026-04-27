"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  FlaskConical, Plus, Trash2, Copy, Check, Clock, RefreshCw,
  Shield, AlertTriangle, CheckCircle2, XCircle, ChevronDown,
  ChevronUp, Eye, EyeOff, Terminal, Zap, Users, Building2,
  Stethoscope, UserCheck, Timer, Info, Loader2
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SandboxAccount {
  role: string
  email: string
  password: string
  user_id: string
  full_name: string
}

interface SandboxSession {
  session_id: string
  name: string
  description: string | null
  created_at: string
  expires_at: string
  destroyed_at: string | null
  status: "ACTIVE" | "EXPIRED" | "DESTROYED"
  accounts: SandboxAccount[]
  metadata: Record<string, string>
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string; loginPath: string }> = {
  agent: {
    label: "Agen",
    icon: UserCheck,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    loginPath: "/agent/login",
  },
  admin_agency: {
    label: "Admin Agency",
    icon: Building2,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    loginPath: "/agent/login",
  },
  hospital_admin: {
    label: "Hospital Admin",
    icon: Stethoscope,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    loginPath: "/hospital/login",
  },
  insurance_admin: {
    label: "Insurance Admin",
    icon: Shield,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    loginPath: "/agent/login",
  },
}

const ALL_ROLES = Object.keys(ROLE_META)

const STATUS_META = {
  ACTIVE: { label: "Aktif", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  EXPIRED: { label: "Kedaluwarsa", icon: Timer, cls: "text-amber-600 bg-amber-50 border-amber-200" },
  DESTROYED: { label: "Dihapus", icon: XCircle, cls: "text-gray-400 bg-gray-50 border-gray-200" },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "Kedaluwarsa"
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1_000)
  if (h > 0) return `${h}j ${m}m`
  if (m > 0) return `${m}m ${s}d`
  return `${s}d`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded-md hover:bg-gray-200 transition-colors" title="Copy">
      {copied
        ? <Check className="h-3 w-3 text-emerald-500" />
        : <Copy className="h-3 w-3 text-gray-400" />}
    </button>
  )
}

// ─── Account row ─────────────────────────────────────────────────────────────

function AccountRow({ acc, sessionStatus }: { acc: SandboxAccount; sessionStatus: string }) {
  const [showPass, setShowPass] = useState(false)
  const meta = ROLE_META[acc.role] || { label: acc.role, icon: Users, color: "bg-gray-50 text-gray-600 border-gray-200", loginPath: "/" }
  const Icon = meta.icon
  const isAlive = sessionStatus === "ACTIVE"

  return (
    <div className={`rounded-xl border p-3 transition-all ${isAlive ? "bg-white border-gray-100" : "bg-gray-50 border-gray-100 opacity-60"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        {isAlive && (
          <a
            href={`${meta.loginPath}?hint=${encodeURIComponent(acc.email)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline font-medium"
          >
            Login →
          </a>
        )}
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        {/* Email */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <span className="text-gray-400 w-14 shrink-0">Email</span>
          <span className="text-gray-800 flex-1 truncate">{acc.email}</span>
          <CopyBtn text={acc.email} />
        </div>
        {/* Password */}
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
          <span className="text-gray-400 w-14 shrink-0">Password</span>
          <span className="text-gray-800 flex-1 font-mono">{showPass ? acc.password : "••••••••••"}</span>
          <button onClick={() => setShowPass(p => !p)} className="p-1 rounded-md hover:bg-gray-200 transition-colors">
            {showPass ? <EyeOff className="h-3 w-3 text-gray-400" /> : <Eye className="h-3 w-3 text-gray-400" />}
          </button>
          <CopyBtn text={acc.password} />
        </div>
        {/* Copy all */}
        <button
          onClick={() => navigator.clipboard.writeText(`Email: ${acc.email}\nPassword: ${acc.password}`)}
          className="w-full text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 py-1 rounded-lg transition-colors text-center font-sans"
        >
          Copy semua kredensial
        </button>
      </div>
    </div>
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onDestroy,
}: {
  session: SandboxSession
  onDestroy: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(session.status === "ACTIVE")
  const [destroying, setDestroying] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (session.status !== "ACTIVE") return
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [session.status])

  const st = STATUS_META[session.status]
  const StatusIcon = st.icon
  const countdown = session.status === "ACTIVE" ? formatCountdown(session.expires_at) : null
  const isExpiring = session.status === "ACTIVE" &&
    new Date(session.expires_at).getTime() - Date.now() < 3_600_000

  const handleDestroy = async () => {
    setDestroying(true)
    try {
      const res = await fetch(`/api/developer/sandbox/${session.session_id}`, { method: "DELETE" })
      if (res.ok) onDestroy(session.session_id)
    } finally {
      setDestroying(false)
      setConfirm(false)
    }
  }

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      session.status === "ACTIVE"
        ? "bg-white border-gray-200 shadow-sm"
        : "bg-gray-50 border-gray-100"
    }`}>
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
              session.status === "ACTIVE" ? "bg-emerald-50" : "bg-gray-100"
            }`}>
              <FlaskConical className={`h-4 w-4 ${session.status === "ACTIVE" ? "text-emerald-600" : "text-gray-400"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">{session.name}</h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>
                  <StatusIcon className="h-3 w-3" />
                  {st.label}
                </span>
              </div>
              {session.description && (
                <p className="text-[11px] text-gray-500 mt-0.5">{session.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Dibuat {formatDate(session.created_at)}
                </span>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Users className="h-3 w-3" /> {session.accounts.length} akun
                </span>
                {countdown && (
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${isExpiring ? "text-red-500" : "text-gray-500"}`}>
                    <Timer className="h-3 w-3" /> {countdown} tersisa
                  </span>
                )}
                {session.status === "DESTROYED" && session.destroyed_at && (
                  <span className="text-[11px] text-gray-400">Dihapus {formatDate(session.destroyed_at)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {session.status === "ACTIVE" && (
              <>
                {confirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-red-600 font-medium">Yakin hapus?</span>
                    <button
                      onClick={handleDestroy}
                      disabled={destroying}
                      className="flex items-center gap-1 text-[11px] bg-red-600 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {destroying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Ya, Hapus
                    </button>
                    <button
                      onClick={() => setConfirm(false)}
                      className="text-[11px] bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirm(true)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Destroy
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </button>
          </div>
        </div>

        {/* Expiry warning bar */}
        {session.status === "ACTIVE" && isExpiring && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-[11px] text-red-600 font-medium">
              Session ini akan kedaluwarsa dalam kurang dari 1 jam. Segera selesaikan testing.
            </span>
          </div>
        )}
      </div>

      {/* Expanded: account list */}
      {expanded && session.accounts.length > 0 && (
        <div className="px-4 sm:px-5 pb-5 border-t border-gray-50 pt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Akun Testing</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {session.accounts.map(acc => (
              <AccountRow key={acc.user_id} acc={acc} sessionStatus={session.status} />
            ))}
          </div>

          {/* Metadata chips */}
          {Object.keys(session.metadata).length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {session.metadata.agency_id && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  <Building2 className="h-3 w-3" /> agency_id: {session.metadata.agency_id.slice(0, 8)}…
                </span>
              )}
              {session.metadata.hospital_id && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg">
                  <Stethoscope className="h-3 w-3" /> hospital_id: {session.metadata.hospital_id.slice(0, 8)}…
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (s: SandboxSession) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ttl, setTtl] = useState(24)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["agent", "admin_agency", "hospital_admin"])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const toggleRole = (r: string) =>
    setSelectedRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const submit = async () => {
    if (selectedRoles.length === 0) { setError("Pilih minimal 1 role."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/developer/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, description: description || undefined, ttlHours: ttl, roles: selectedRoles }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal membuat session")
      // Shape response into SandboxSession
      onCreate({
        session_id: data.session_id,
        name: data.name,
        description: description || null,
        created_at: new Date().toISOString(),
        expires_at: data.expires_at,
        destroyed_at: null,
        status: "ACTIVE",
        accounts: data.accounts,
        metadata: data.metadata,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Buat Sandbox Session</h2>
              <p className="text-[11px] text-white/60 mt-0.5">Akun testing akan otomatis dibuat & dihapus</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Nama Session</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="mis. Sprint 24 Testing"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Deskripsi (opsional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tujuan testing ini..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 transition-all bg-gray-50 focus:bg-white resize-none"
            />
          </div>

          {/* Roles */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Role yang dibuat</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map(r => {
                const meta = ROLE_META[r]
                const Icon = meta.icon
                const active = selectedRoles.includes(r)
                return (
                  <button
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      active ? "bg-gray-900 text-white border-transparent" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-[12px] font-semibold">{meta.label}</span>
                    {active && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TTL */}
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Durasi Session: <span className="text-gray-900">{ttl} jam</span>
            </label>
            <input
              type="range" min={1} max={72} step={1} value={ttl}
              onChange={e => setTtl(Number(e.target.value))}
              className="w-full accent-gray-900"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>1j</span><span>24j</span><span>48j</span><span>72j</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-[12px] text-red-600">{error}</span>
            </div>
          )}

          {/* Info box */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
            <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span className="text-[11px] text-blue-600">
              Semua data sandbox akan dihapus bersih saat di-destroy atau otomatis setelah {ttl} jam.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
            Batal
          </button>
          <button
            onClick={submit}
            disabled={loading || selectedRoles.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? "Membuat…" : "Buat Session"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SandboxPage() {
  const [sessions, setSessions] = useState<SandboxSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "DESTROYED">("ALL")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/developer/sandbox")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    // Poll every 30s to catch server-side auto-expiry updates
    pollRef.current = setInterval(fetchSessions, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchSessions])

  const handleCreate = (session: SandboxSession) => {
    setSessions(prev => [session, ...prev])
    setShowModal(false)
  }

  const handleDestroy = (id: string) => {
    setSessions(prev => prev.map(s =>
      s.session_id === id
        ? { ...s, status: "DESTROYED" as const, destroyed_at: new Date().toISOString() }
        : s
    ))
  }

  const filtered = filter === "ALL" ? sessions : sessions.filter(s => s.status === filter)

  const activeCnt = sessions.filter(s => s.status === "ACTIVE").length
  const expiredCnt = sessions.filter(s => s.status === "EXPIRED").length
  const destroyedCnt = sessions.filter(s => s.status === "DESTROYED").length
  const totalAccounts = sessions.filter(s => s.status === "ACTIVE").reduce((n, s) => n + s.accounts.length, 0)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-slate-900 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 10% 50%, #10b981 0%, transparent 40%), radial-gradient(circle at 90% 20%, #6366f1 0%, transparent 35%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-semibold tracking-widest uppercase text-emerald-400">Developer Tools</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sandbox Testing</h1>
            <p className="text-sm text-white/60 mt-1 max-w-lg">
              Buat akun testing sementara — agen, admin agency, hospital admin — lalu destroy bersih setelah selesai. Seperti AWS sandbox.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-gray-100 transition-all shrink-0 shadow-lg"
          >
            <Plus className="h-4 w-4" /> Buat Session Baru
          </button>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Session Aktif", value: activeCnt, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Akun Testing", value: totalAccounts, icon: Users, color: "text-blue-400" },
            { label: "Kedaluwarsa", value: expiredCnt, icon: Timer, color: "text-amber-400" },
            { label: "Dihapus", value: destroyedCnt, icon: XCircle, color: "text-gray-400" },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-[11px] text-white/60">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── How it works ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: "1", icon: Zap, title: "Buat Session", desc: "Pilih role yang dibutuhkan, atur durasi, klik Create. Akun langsung aktif." },
          { step: "2", icon: Terminal, title: "Gunakan untuk Testing", desc: "Login dengan kredensial yang dibuat. Semua akun sudah ACTIVE dan siap dipakai." },
          { step: "3", icon: Trash2, title: "Destroy Setelah Selesai", desc: "Klik Destroy — semua user, agency, hospital, dan data terkait dihapus bersih dari DB." },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.step} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
              <div className="h-8 w-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Filter tabs + refresh ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["ALL", "ACTIVE", "EXPIRED", "DESTROYED"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "ALL" ? `Semua (${sessions.length})` : f === "ACTIVE" ? `Aktif (${activeCnt})` : f === "EXPIRED" ? `Kedaluwarsa (${expiredCnt})` : `Dihapus (${destroyedCnt})`}
            </button>
          ))}
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Session list ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl text-center">
          <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <FlaskConical className="h-7 w-7 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">
            {filter === "ALL" ? "Belum ada sandbox session" : `Tidak ada session ${filter.toLowerCase()}`}
          </p>
          <p className="text-[12px] text-gray-400 mb-5 max-w-xs">
            {filter === "ALL"
              ? "Buat session pertama untuk mulai testing dengan akun temporary."
              : "Coba pilih filter lain atau buat session baru."}
          </p>
          {filter === "ALL" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all"
            >
              <Plus className="h-4 w-4" /> Buat Session Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(s => (
            <SessionCard key={s.session_id} session={s} onDestroy={handleDestroy} />
          ))}
        </div>
      )}

      {/* ── Create modal ── */}
      {showModal && (
        <CreateModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
