"use client"

import { useState, useEffect } from "react"
import {
  Users, UserCheck, Building2, Briefcase, Activity,
  CheckCircle2, XCircle, Plus, Loader2, X, RefreshCw, Terminal,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/* ─── Types ─────────────────────────────────────────────────── */
type StatData = {
  total_users?: number
  active_users?: number
  pending_users?: number
  total_claims?: number
  total_agents?: number
  total_agencies?: number
  total_hospitals?: number
}

type PendingUser = {
  user_id: string
  email: string
  role: string
  full_name?: string
  created_at?: string
}

interface QuickForm {
  open: boolean
  role: "agent" | "agency" | "hospital" | null
  email: string
  password: string
  fullName: string
  phone: string
  loading: boolean
  result: string | null
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function TerminalPage() {
  const [stats, setStats] = useState<StatData | null>(null)
  const [pending, setPending] = useState<PendingUser[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [pendingLoading, setPendingLoading] = useState(true)
  const [form, setForm] = useState<QuickForm>({
    open: false, role: null,
    email: "", password: "", fullName: "", phone: "",
    loading: false, result: null,
  })

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const r = await fetch("/api/developer/stats")
      if (r.ok) { const d = await r.json(); setStats(d.stats ?? d) }
    } finally { setStatsLoading(false) }
  }

  async function fetchPending() {
    setPendingLoading(true)
    try {
      const r = await fetch("/api/developer/pending")
      if (r.ok) { const d = await r.json(); setPending(d.pending ?? []) }
    } finally { setPendingLoading(false) }
  }

  useEffect(() => { fetchStats(); fetchPending() }, [])

  async function approveUser(userId: string) {
    await fetch("/api/developer/approve", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    fetchPending(); fetchStats()
  }

  async function rejectUser(userId: string) {
    await fetch("/api/developer/reject", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    fetchPending(); fetchStats()
  }

  async function submitCreate() {
    const { role, email, password, fullName, phone } = form
    if (!email || !password || !fullName || !role) return
    const roleMap: Record<string, string> = {
      agent: "agent", agency: "admin_agency", hospital: "hospital_admin",
    }
    setForm(f => ({ ...f, loading: true, result: null }))
    try {
      const r = await fetch("/api/developer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: roleMap[role], fullName, phoneNumber: phone }),
      })
      const d = await r.json()
      if (!r.ok) {
        setForm(f => ({ ...f, loading: false, result: `error:${d.error}` }))
      } else {
        setForm(f => ({ ...f, loading: false, result: `ok:${d.user.user_id}` }))
        fetchStats()
        setTimeout(() => setForm(f => ({
          ...f, open: false, email: "", password: "", fullName: "", phone: "", result: null,
        })), 1500)
      }
    } catch (err) {
      setForm(f => ({ ...f, loading: false, result: `error:${String(err)}` }))
    }
  }

  const statCards = [
    { label: "Total Users",   value: stats?.total_users,    icon: Users,      color: "text-gray-900" },
    { label: "Active Users",  value: stats?.active_users,   icon: Activity,   color: "text-emerald-600" },
    { label: "Pending",       value: stats?.pending_users,  icon: UserCheck,  color: "text-amber-600" },
    { label: "Agents",        value: stats?.total_agents,   icon: Users,      color: "text-blue-600" },
    { label: "Agencies",      value: stats?.total_agencies, icon: Briefcase,  color: "text-violet-600" },
    { label: "Hospitals",     value: stats?.total_hospitals,icon: Building2,  color: "text-teal-600" },
  ]

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="h-5 w-5 text-gray-400" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Terminal</h1>
          </div>
          <p className="text-sm text-gray-500">
            Manage accounts and approvals. CLI available in the bar below.
          </p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchPending() }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="shadow-sm">
              <CardHeader className="pb-1 pt-5 px-5">
                <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {statsLoading
                  ? <div className="h-8 w-12 bg-gray-100 animate-pulse rounded" />
                  : <p className={`text-3xl font-black leading-none ${s.color}`}>
                      {s.value ?? "—"}
                    </p>
                }
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two columns: Quick Create + Pending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Quick Create */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-gray-900">Quick Create</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Create a new account and set it ACTIVE immediately</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(["agent", "agency", "hospital"] as const).map(role => (
              <button
                key={role}
                onClick={() => setForm(f => ({
                  ...f, open: true, role,
                  email: "", password: "", fullName: "", phone: "", result: null,
                }))}
                className="w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200 text-gray-700 px-4 py-3 text-sm font-medium transition-all group"
              >
                <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                <span className="capitalize">New {role}</span>
                <span className="ml-auto text-xs text-gray-300 capitalize group-hover:text-gray-400">
                  {role === "agent" ? "agent" : role === "agency" ? "admin_agency" : "hospital_admin"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">
                  Pending Approvals
                  {pending.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold px-1.5">
                      {pending.length}
                    </span>
                  )}
                </CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Users waiting for activation</p>
              </div>
              <button
                onClick={fetchPending}
                className="text-gray-300 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="space-y-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All clear — no pending approvals</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pending.map(u => (
                  <div
                    key={u.user_id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.email}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">
                        {u.role.replace("_", " ")} · {u.full_name ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => approveUser(u.user_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectUser(u.user_id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-[11px] font-bold transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Create Modal */}
      {form.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm shadow-2xl shadow-black/10">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <p className="font-bold text-gray-900 capitalize">Create {form.role}</p>
                <p className="text-xs text-gray-400 mt-0.5">Account status will be set to ACTIVE</p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, open: false }))}
                className="text-gray-300 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: "Full Name",         key: "fullName"  as const, placeholder: "John Doe",        type: "text"     },
                { label: "Email",             key: "email"     as const, placeholder: "john@email.com",  type: "email"    },
                { label: "Password",          key: "password"  as const, placeholder: "Min. 8 characters", type: "password" },
                { label: "Phone (optional)",  key: "phone"     as const, placeholder: "+628123456789",   type: "tel"      },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-400 focus:bg-white transition-all"
                  />
                </div>
              ))}

              {form.result && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  form.result.startsWith("ok:")
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {form.result.startsWith("ok:")
                    ? `✓ Created successfully`
                    : `✗ ${form.result.slice(6)}`}
                </div>
              )}

              <button
                onClick={submitCreate}
                disabled={form.loading || !form.email || !form.password || !form.fullName}
                className="w-full h-11 rounded-xl bg-gray-900 hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                {form.loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  : <><Plus className="h-4 w-4" /> Create <span className="capitalize">{form.role}</span></>
                }
              </button>
            </div>

            {/* CLI equivalent */}
            <div className="px-6 pb-5">
              <p className="font-mono text-[10px] text-gray-300 break-all">
                {`create ${form.role} --email "${form.email || "…"}" --password "…" --name "${form.fullName || "…"}"`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
