"use client"

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react"
import { ChevronUp, ChevronDown, Minus, Copy, Trash2, Loader2, TerminalIcon } from "lucide-react"

/* ─── Types ─────────────────────────────────────────────────── */
type LineType = "command" | "success" | "error" | "info" | "warn" | "muted" | "blank" | "heading"

interface OutputLine {
  id: string
  type: LineType
  text: string
  ts: Date
}

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
}

/* ─── Helpers ───────────────────────────────────────────────── */
let lineId = 0
function mkLine(type: LineType, text: string): OutputLine {
  return { id: String(++lineId), type, text, ts: new Date() }
}

function tokenize(raw: string): string[] {
  const tokens: string[] = []
  let cur = ""
  let inQ = false
  for (const ch of raw.trim()) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === " " && !inQ) { if (cur) { tokens.push(cur); cur = "" } }
    else { cur += ch }
  }
  if (cur) tokens.push(cur)
  return tokens
}

function parseFlags(tokens: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith("--")) {
      const key = tokens[i].slice(2)
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith("--")) {
        flags[key] = tokens[i + 1]; i++
      } else { flags[key] = "true" }
    }
  }
  return flags
}

function ts(d: Date) {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

const COMMANDS = [
  "help", "status", "ping",
  "list pending", "list users",
  "create agent", "create agency", "create hospital",
  "approve", "reject",
  "whoami", "clear",
]

const HELP_LINES: [string, string][] = [
  ["help", "Show this help"],
  ["status", "System stats"],
  ["ping", "Check API health"],
  ["list pending", "List pending users awaiting approval"],
  ["create agent --email X --password X --name \"Name\"", "Create agent account"],
  ["create agency --email X --password X --name \"Name\"", "Create agency admin"],
  ["create hospital --email X --password X --name \"Name\"", "Create hospital admin"],
  ["approve <userId>", "Approve pending user"],
  ["reject <userId>", "Reject pending user"],
  ["whoami", "Current session info"],
  ["clear", "Clear output"],
]

const lineColor: Record<LineType, string> = {
  command: "text-white",
  success: "text-emerald-400",
  error:   "text-red-400",
  info:    "text-blue-300",
  warn:    "text-amber-400",
  muted:   "text-white/30",
  blank:   "",
  heading: "text-white font-semibold",
}

/* ─── Component ─────────────────────────────────────────────── */
export function DevTerminalDrawer() {
  const [expanded, setExpanded] = useState(false)
  const [lines, setLines] = useState<OutputLine[]>([
    mkLine("muted", "AsistenQu Developer Terminal  —  type help for commands"),
    mkLine("blank", ""),
  ])
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const [loading, setLoading] = useState(false)

  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* auto-scroll */
  useEffect(() => {
    if (expanded) {
      outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [lines, expanded])

  /* focus on expand */
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [expanded])

  const push = useCallback((...newLines: OutputLine[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  const run = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    setHistory(h => [trimmed, ...h.slice(0, 49)])
    setHistIdx(-1)
    push(mkLine("command", `$ ${trimmed}`))
    setLoading(true)

    const tokens = tokenize(trimmed)
    const cmd = tokens[0]?.toLowerCase()
    const sub = tokens[1]?.toLowerCase()
    const flags = parseFlags(tokens)

    try {
      if (cmd === "help") {
        push(mkLine("blank", ""), mkLine("heading", "Commands"))
        for (const [c, d] of HELP_LINES) {
          push(mkLine("info", `  ${c}`))
          push(mkLine("muted", `    → ${d}`))
        }
        push(mkLine("blank", ""))
      }

      else if (cmd === "clear") {
        setLines([mkLine("muted", "Cleared."), mkLine("blank", "")])
        setLoading(false); return
      }

      else if (cmd === "ping") {
        const t0 = Date.now()
        const r = await fetch("/api/health")
        const ms = Date.now() - t0
        push(r.ok
          ? mkLine("success", `✓ API healthy · ${ms}ms`)
          : mkLine("error", `✗ API returned ${r.status} · ${ms}ms`))
      }

      else if (cmd === "whoami") {
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}")
          if (user?.email) {
            push(
              mkLine("info",  `Email:  ${user.email}`),
              mkLine("info",  `Role:   ${user.role}`),
              mkLine("muted", `ID:     ${user.user_id ?? "—"}`),
            )
          } else {
            push(mkLine("warn", "No session found."))
          }
        } catch {
          push(mkLine("warn", "No session found."))
        }
      }

      else if (cmd === "status") {
        push(mkLine("muted", "Fetching stats…"))
        const r = await fetch("/api/developer/stats")
        const d = await r.json()
        if (!r.ok) { push(mkLine("error", `✗ ${d.error}`)); setLoading(false); return }
        const s: StatData = d.stats ?? d
        push(
          mkLine("blank", ""),
          mkLine("heading", "System Status"),
          mkLine("success", `  Total Users    ${s.total_users ?? "—"}`),
          mkLine("success", `  Active Users   ${s.active_users ?? "—"}`),
          mkLine("warn",    `  Pending        ${s.pending_users ?? "—"}`),
          mkLine("info",    `  Agents         ${s.total_agents ?? "—"}`),
          mkLine("info",    `  Agencies       ${s.total_agencies ?? "—"}`),
          mkLine("info",    `  Hospitals      ${s.total_hospitals ?? "—"}`),
          mkLine("info",    `  Claims         ${s.total_claims ?? "—"}`),
          mkLine("blank", ""),
        )
      }

      else if (cmd === "list") {
        if (sub === "pending") {
          push(mkLine("muted", "Fetching pending users…"))
          const r = await fetch("/api/developer/pending")
          const d = await r.json()
          if (!r.ok) { push(mkLine("error", `✗ ${d.error}`)); setLoading(false); return }
          const list: PendingUser[] = d.pending ?? []
          if (list.length === 0) {
            push(mkLine("muted", "  No pending users."))
          } else {
            push(mkLine("blank", ""), mkLine("heading", `Pending (${list.length})`))
            for (const u of list) {
              push(
                mkLine("warn",  `  ${u.email}`),
                mkLine("muted", `    ${u.role}  ·  ${u.full_name ?? "—"}  ·  ${u.user_id.slice(0, 12)}…`),
              )
            }
            push(mkLine("blank", ""), mkLine("info", "  Use: approve <userId>"))
          }
          push(mkLine("blank", ""))
        } else {
          push(mkLine("error", "Usage: list pending"))
        }
      }

      else if (cmd === "create") {
        const roleMap: Record<string, string> = {
          agent: "agent", agency: "admin_agency", hospital: "hospital_admin",
        }
        const apiRole = roleMap[sub ?? ""]
        if (!apiRole) {
          push(mkLine("error", `✗ Unknown type "${sub}". Use: agent | agency | hospital`))
          setLoading(false); return
        }
        const email    = flags.email    || flags.e
        const password = flags.password || flags.p
        const fullName = flags.name     || flags.n
        const phone    = flags.phone
        if (!email || !password || !fullName) {
          push(
            mkLine("error", "✗ Missing required flags:"),
            mkLine("muted", "  --email X  --password X  --name \"Full Name\""),
          )
          setLoading(false); return
        }
        push(mkLine("muted", `Creating ${sub} → ${email}…`))
        const r = await fetch("/api/developer/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role: apiRole, fullName, phoneNumber: phone }),
        })
        const d = await r.json()
        if (!r.ok) {
          push(mkLine("error", `✗ ${d.error}`))
        } else {
          push(
            mkLine("blank", ""),
            mkLine("success", `✓ Created ${sub}  ${d.user.user_id.slice(0, 12)}…`),
            mkLine("info",    `  ${d.user.email}  →  ACTIVE`),
            mkLine("blank", ""),
          )
        }
      }

      else if (cmd === "approve") {
        const userId = tokens[1]
        if (!userId) { push(mkLine("error", "Usage: approve <userId>")); setLoading(false); return }
        push(mkLine("muted", `Approving ${userId.slice(0, 12)}…`))
        const r = await fetch("/api/developer/approve", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        const d = await r.json()
        if (!r.ok) push(mkLine("error", `✗ ${d.error}`))
        else push(mkLine("success", `✓ User approved → ACTIVE`))
      }

      else if (cmd === "reject") {
        const userId = tokens[1]
        if (!userId) { push(mkLine("error", "Usage: reject <userId>")); setLoading(false); return }
        push(mkLine("muted", `Rejecting ${userId.slice(0, 12)}…`))
        const r = await fetch("/api/developer/reject", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        })
        const d = await r.json()
        if (!r.ok) push(mkLine("error", `✗ ${d.error}`))
        else push(mkLine("warn", `✓ User rejected`))
      }

      else {
        push(mkLine("error", `✗ Unknown command: "${cmd}". Type help.`))
      }

    } catch (err: unknown) {
      push(mkLine("error", `✗ ${err instanceof Error ? err.message : String(err)}`))
    }

    setLoading(false)
  }, [push])

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = input; setInput(""); run(val)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next); setInput(history[next] ?? "")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next); setInput(next === -1 ? "" : history[next] ?? "")
    } else if (e.key === "Tab") {
      e.preventDefault()
      const match = COMMANDS.find(c => c.startsWith(input.toLowerCase()) && c !== input.toLowerCase())
      if (match) setInput(match)
    }
  }

  return (
    <div
      className={[
        "fixed bottom-0 right-0 left-0 sm:left-[260px] z-30",
        "bg-[#0d0d0d] border-t border-white/[0.07]",
        "flex flex-col transition-all duration-200 ease-out",
        expanded ? "h-80" : "h-10",
      ].join(" ")}
    >
      {/* ── Title bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 h-10 px-4 shrink-0 cursor-pointer select-none group"
        onClick={() => {
          setExpanded(v => !v)
        }}
      >
        {/* macOS dots */}
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
        </div>

        <TerminalIcon className="h-3.5 w-3.5 text-white/25 shrink-0" />
        <span className="text-white/30 text-xs font-mono tracking-wide flex-1">
          asistenqu — developer terminal
        </span>

        {loading && <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />}

        {/* Minimize / Expand */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
          className="text-white/20 hover:text-white/60 transition-colors shrink-0 p-0.5"
          title={expanded ? "Minimize" : "Expand"}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setLines([mkLine("muted", "Cleared."), mkLine("blank", "")])
          }}
          className="text-white/15 hover:text-white/50 transition-colors shrink-0 p-0.5"
          title="Clear"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* ── Body (shown only when expanded) ───────────────────── */}
      {expanded && (
        <div
          className="flex flex-col flex-1 min-h-0 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Output */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12px] leading-[1.65] space-y-0"
          >
            {lines.map(line => (
              <div key={line.id} className={`group flex items-start gap-2 ${lineColor[line.type]}`}>
                {line.type !== "blank" && (
                  <span className="text-white/[0.12] text-[10px] mt-px shrink-0 w-14 select-none tabular-nums">
                    {ts(line.ts)}
                  </span>
                )}
                <span className="flex-1 whitespace-pre-wrap break-all">{line.text}</span>
                {line.type === "command" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(line.text.slice(2)).catch(() => {})
                    }}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 transition-all shrink-0 mt-px"
                  >
                    <Copy className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ))}

            {!loading && (
              <div className="flex items-center gap-2 text-white/40 mt-1">
                <span className="text-white/[0.12] text-[10px] w-14 select-none">{ts(new Date())}</span>
                <span className="text-emerald-400 select-none font-mono">$</span>
                <span className="w-1.5 h-3.5 bg-emerald-400/60 animate-cursor inline-block" />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/[0.06] px-4 py-2 flex items-center gap-2.5">
            <span className="text-emerald-400 font-mono text-[12px] shrink-0 select-none">›</span>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading}
              placeholder={loading ? "Running…" : "Enter command… (Tab autocomplete · ↑↓ history)"}
              className="flex-1 bg-transparent text-white font-mono text-[12px] outline-none placeholder:text-white/[0.15] disabled:opacity-50"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
      )}
    </div>
  )
}
