"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, TerminalIcon, Maximize2, Minimize2,
  ChevronUp, ChevronDown, UserPlus,
} from "lucide-react"

type PendingUser = {
  user_id: string
  email: string
  role: string
  full_name?: string
}

interface AddUserForm {
  open: boolean
  email: string
  password: string
  role: string
  fullName: string
  phone: string
  loading: boolean
  error: string | null
  success: boolean
}

const ROLES = [
  { value: "agent",           label: "Agent" },
  { value: "admin_agency",    label: "Agency Admin" },
  { value: "hospital_admin",  label: "Hospital Admin" },
  { value: "insurance_admin", label: "Insurance Admin" },
  { value: "developer",       label: "Developer" },
]

export function DevTerminalDrawer() {
  const [size, setSize] = useState<"minimized" | "half" | "full">("minimized")
  const [pending, setPending] = useState<PendingUser[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

  const [form, setForm] = useState<AddUserForm>({
    open: false,
    email: "", password: "", role: "agent", fullName: "", phone: "",
    loading: false, error: null, success: false,
  })

  async function fetchPending() {
    setPendingLoading(true)
    try {
      const r = await fetch("/api/developer/pending")
      if (r.ok) { const d = await r.json(); setPending(d.pending ?? []) }
    } finally { setPendingLoading(false) }
  }

  useEffect(() => {
    if (size !== "minimized") fetchPending()
  }, [size])

  async function approveUser(userId: string) {
    await fetch("/api/developer/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    fetchPending()
  }

  async function rejectUser(userId: string) {
    await fetch("/api/developer/reject", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    fetchPending()
  }

  function resetForm() {
    setForm({
      open: false, email: "", password: "", role: "agent",
      fullName: "", phone: "", loading: false, error: null, success: false,
    })
  }

  async function submitAddUser(e: React.FormEvent) {
    e.preventDefault()
    setForm(f => ({ ...f, loading: true, error: null, success: false }))
    const needsProfile = form.role === "agent" || form.role === "hospital_admin"
    try {
      const res = await fetch("/api/developer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
          fullName: needsProfile ? form.fullName : undefined,
          phoneNumber: needsProfile && form.phone ? form.phone : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setForm(f => ({ ...f, loading: false, error: data.error || "Gagal membuat user" }))
      } else {
        setForm(f => ({ ...f, loading: false, success: true }))
        setTimeout(() => resetForm(), 1800)
      }
    } catch {
      setForm(f => ({ ...f, loading: false, error: "Terjadi kesalahan jaringan" }))
    }
  }

  const isFullscreen = size === "full"
  const isExpanded = size !== "minimized"
  const needsProfile = form.role === "agent" || form.role === "hospital_admin"

  return (
    <div
      className={[
        "fixed bottom-0 right-0 left-0 sm:left-[260px] z-50",
        "bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.05)]",
        "flex flex-col transition-all duration-300 ease-out",
        size === "full" ? "h-screen" : size === "half" ? "h-[60vh]" : "h-11",
      ].join(" ")}
    >
      {/* ── Title bar ─────────────────────────────────────────── */}
      <div
        className={`flex items-center gap-3 h-11 px-4 shrink-0 cursor-pointer select-none group border-b transition-colors ${isExpanded ? "border-gray-100 bg-gray-50/50" : "border-transparent hover:bg-gray-50 bg-white"}`}
        onClick={() => {
          if (size === "minimized") setSize("half")
          else setSize("minimized")
        }}
      >
        <TerminalIcon className="h-4 w-4 text-emerald-500 shrink-0 group-hover:text-emerald-600 transition-colors" />
        <span className="text-gray-900 font-bold tracking-wide flex-1 text-sm">
          Developer Terminal
        </span>

        {pending.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold px-1.5 shrink-0">
            {pending.length} Pending
          </span>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setSize(s => s === "full" ? "half" : "full")
            }}
            className="text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors shrink-0 p-1"
            title={isFullscreen ? "Restore" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setSize(s => s === "minimized" ? "half" : "minimized") }}
            className="text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors shrink-0 p-1"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 sm:p-6 pb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Add User Panel ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Add New User</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Create a new platform account instantly</p>
                </div>
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <form onSubmit={submitAddUser} className="p-5 space-y-4">

                {/* Role */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Email + Password */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Email</label>
                    <input
                      type="email" required value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="user@example.com"
                      className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Password</label>
                    <input
                      type="password" required value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                    />
                  </div>
                </div>

                {/* Profile (conditional) */}
                {needsProfile && (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Profile Details</p>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Full Name</label>
                      <input
                        type="text" required value={form.fullName}
                        onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                        placeholder="Full name"
                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Phone (optional)</label>
                      <input
                        type="tel" value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+62812..."
                        className="w-full h-10 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Error / Success */}
                {form.error && (
                  <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{form.error}</p>
                )}
                {form.success && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" /> User berhasil dibuat!
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={form.loading}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {form.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Create User
                  </button>
                </div>
              </form>
            </div>

            {/* ── Pending Approvals ─────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit md:h-[calc(100vh-160px)] max-h-[500px]">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    Pending Approvals
                    {pending.length > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Users waiting for review</p>
                </div>
                <button onClick={fetchPending} className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <RefreshCw className={`h-4 w-4 ${pendingLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {pendingLoading ? (
                  <div className="space-y-3">
                    <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                    <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                  </div>
                ) : pending.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">All clear — no pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pending.map(u => (
                      <div key={u.user_id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                          {u.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.email}</p>
                          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">
                            {u.role.replace(/_/g, " ")} {u.full_name ? `· ${u.full_name}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => approveUser(u.user_id)}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => rejectUser(u.user_id)}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
