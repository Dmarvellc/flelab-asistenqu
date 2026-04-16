"use client"

import { useState, useEffect } from "react"
import {
  Users, UserCheck, Building2, Briefcase, Activity,
  CheckCircle2, XCircle, Plus, Loader2, X, RefreshCw, TerminalIcon, Maximize2, Minimize2, ChevronUp, ChevronDown
} from "lucide-react"

type PendingUser = {
  user_id: string
  email: string
  role: string
  full_name?: string
}

interface QuickForm {
  open: boolean
  role: "agent" | "agency" | "hospital" | null
  organizationName: string
  email: string
  password: string
  fullName: string
  phone: string
  loading: boolean
  result: string | null
}

export function DevTerminalDrawer() {
  const [size, setSize] = useState<"minimized" | "half" | "full">("minimized")
  const [pending, setPending] = useState<PendingUser[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [form, setForm] = useState<QuickForm>({
    open: false, role: null,
    organizationName: "", email: "", password: "", fullName: "", phone: "",
    loading: false, result: null,
  })

  async function fetchPending() {
    setPendingLoading(true)
    try {
      const r = await fetch("/api/developer/pending")
      if (r.ok) { const d = await r.json(); setPending(d.pending ?? []) }
    } finally { setPendingLoading(false) }
  }

  useEffect(() => {
    if (size !== "minimized") {
      fetchPending()
    }
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

  async function submitCreate() {
    const { role, organizationName, email, password, fullName, phone } = form
    if (!email || !password || !fullName || !role) return
    const roleMap: Record<string, string> = {
      agent: "agent", agency: "admin_agency", hospital: "hospital_admin",
    }
    setForm(f => ({ ...f, loading: true, result: null }))
    try {
      const r = await fetch("/api/developer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: roleMap[role], organizationName, fullName, phoneNumber: phone }),
      })
      const d = await r.json()
      if (!r.ok) {
        setForm(f => ({ ...f, loading: false, result: `error:${d.error}` }))
      } else {
        setForm(f => ({ ...f, loading: false, result: `ok:${d.user.user_id}` }))
        setTimeout(() => setForm(f => ({
          ...f, open: false, organizationName: "", email: "", password: "", fullName: "", phone: "", result: null,
        })), 1500)
      }
    } catch (err) {
      setForm(f => ({ ...f, loading: false, result: `error:${String(err)}` }))
    }
  }

  const isFullscreen = size === "full"
  const isExpanded = size !== "minimized"

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
          Developer Utilities
        </span>

        {pending.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold px-1.5 shrink-0">
            {pending.length} Pending
          </span>
        )}

        {/* Maximize / Minimize controls */}
        <div className="flex items-center gap-1">
          {/* Fullscreen Toggle */}
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

          {/* Expand / Collapse */}
          <button
            onClick={(e) => { e.stopPropagation(); setSize(s => s === "minimized" ? "half" : "minimized") }}
            className="text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors shrink-0 p-1"
          >
            {isExpanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────── */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4 sm:p-6 pb-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Quick Create */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Quick Create Role</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Setup new active accounts instantly</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {(["agent", "agency", "hospital"] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setForm(f => ({
                      ...f, open: true, role,
                      organizationName: "", email: "", password: "", fullName: "", phone: "", result: null,
                    }))}
                    className="w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-200 hover:shadow-sm text-gray-700 px-4 py-3 text-sm font-medium transition-all group"
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    <span className="capitalize">New {role}</span>
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-widest text-gray-300">
                      {role === "agent" ? "Agent User" : role === "agency" ? "Agency Admin" : "Hospital Admin"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit md:h-[calc(100vh-160px)] max-h-[500px]">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 border-b-0 space-x-2">
                    Pending Approvals
                    {pending.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pending.length}</span>}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Need attention</p>
                </div>
                <button onClick={fetchPending} className="text-gray-400 hover:text-gray-900">
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{u.email}</p>
                          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest mt-1">
                            {u.role.replace("_", " ")} {u.full_name ? `• ${u.full_name}` : ""}
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

      {/* Quick Create Modal Overflow */}
      {form.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden scale-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <p className="font-bold text-gray-900 capitalize text-sm">Create {form.role}</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, open: false }))} className="text-gray-400 hover:text-gray-900 bg-white shadow-sm border border-gray-100 p-1.5 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                ...(form.role === "hospital" || form.role === "agency" 
                  ? [{ label: form.role === "hospital" ? "Hospital Name" : "Agency Name", key: "organizationName" as const, placeholder: "e.g., RS Bethesda", type: "text" }] 
                  : []),
                { label: form.role === "agent" ? "Full Name" : "Admin Full Name", key: "fullName"  as const, placeholder: "John Doe",        type: "text"     },
                { label: "Email",             key: "email"     as const, placeholder: "user@email.com",  type: "email"    },
                { label: "Password",          key: "password"  as const, placeholder: "Min. 8 characters", type: "password" },
                { label: "Phone (optional)",  key: "phone"     as const, placeholder: "+628123456789",   type: "tel"      },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              ))}

              {form.result && (
                <div className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  form.result.startsWith("ok:") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}>
                  {form.result.startsWith("ok:") ? `✓ Created successfully` : `✗ ${form.result.slice(6)}`}
                </div>
              )}

              <button
                onClick={submitCreate}
                disabled={form.loading || !form.email || !form.password || !form.fullName || ((form.role === 'hospital' || form.role === 'agency') && !form.organizationName)}
                className="w-full h-11 mt-2 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {form.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {form.loading ? "Creating..." : `Create ${form.role}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
