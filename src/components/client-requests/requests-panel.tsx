"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  MessageSquare,
  History as HistoryIcon,
  Loader2,
  Send,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RELATION_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  type ClientRequestDetail,
  type ClientRequestRow,
  type ClientRequestStatus,
} from "./types";
import { NewClientRequestDialog } from "./new-request-dialog";

type Mode = "agent" | "hospital";

/**
 * The reusable requests panel. Used in two contexts:
 *   - mode="agent":   shown on agent's client detail page
 *   - mode="hospital": shown on hospital's patient detail page
 *
 * Behavior differs:
 *   - agent can create new requests; hospital cannot
 *   - hospital has approve/reject buttons on pending items
 *   - agent has cancel button on own pending items
 *   - both see the same audit trail + messages
 */
export function ClientRequestsPanel({
  mode,
  clientId,
  hospitalId,
  claimId,
}: {
  mode: Mode;
  clientId: string;
  hospitalId: string;
  claimId?: string | null;
}) {
  const [rows, setRows] = useState<ClientRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client-requests?clientId=${clientId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const j = (await res.json()) as { requests: ClientRequestRow[] };
        setRows(j.requests ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "pending").length,
    [rows],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Permintaan Klien</h3>
          <p className="text-xs text-gray-500">
            {mode === "agent"
              ? "Pengajuan dari klien/keluarga ke rumah sakit."
              : "Pengajuan dari agen atas nama klien."}
            {pendingCount > 0 && (
              <span className="ml-1 text-amber-700 font-medium">
                · {pendingCount} menunggu
              </span>
            )}
          </p>
        </div>
        {mode === "agent" && (
          <NewClientRequestDialog
            clientId={clientId}
            hospitalId={hospitalId}
            claimId={claimId ?? null}
            onCreated={load}
          />
        )}
      </div>

      {loading ? (
        <div className="text-xs text-gray-400">Memuat...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
          <FileText className="h-6 w-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-500">Belum ada permintaan</p>
          {mode === "agent" && (
            <p className="text-xs text-gray-400 mt-0.5">
              Klik &quot;Buat Request&quot; di atas untuk mulai.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <RequestRow key={r.id} row={r} onClick={() => setSelectedId(r.id)} />
          ))}
        </ul>
      )}

      <RequestDetailSheet
        mode={mode}
        requestId={selectedId}
        onClose={() => setSelectedId(null)}
        onChange={load}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/*  ROW                                                             */
/* ──────────────────────────────────────────────────────────────── */

function RequestRow({ row, onClick }: { row: ClientRequestRow; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-xl border border-gray-200 hover:border-gray-900 hover:shadow-sm bg-white px-4 py-3 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {TYPE_LABELS[row.request_type]}
              </span>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtDate(row.created_at)} · oleh {row.agent_email ?? "agent"} ·{" "}
              atas permintaan {RELATION_LABELS[row.requested_by_relation]}
              {row.requested_by_name ? ` (${row.requested_by_name})` : ""}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

function StatusBadge({ status }: { status: ClientRequestStatus }) {
  const map: Record<ClientRequestStatus, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", map[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ──────────────────────────────────────────────────────────────── */
/*  DETAIL SHEET                                                    */
/* ──────────────────────────────────────────────────────────────── */

function RequestDetailSheet({
  mode,
  requestId,
  onClose,
  onChange,
}: {
  mode: Mode;
  requestId: string | null;
  onClose: () => void;
  onChange: () => void;
}) {
  const [detail, setDetail] = useState<ClientRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | "approve" | "reject" | "cancel">(
    null,
  );
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!requestId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/client-requests/${requestId}`, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { request: ClientRequestDetail };
        setDetail(j.request);
      }
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = !!requestId;

  const sendMessage = async () => {
    if (!message.trim() || !requestId) return;
    setSending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/client-requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal mengirim pesan");
      }
      setMessage("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setSending(false);
    }
  };

  const doAction = async (action: "approve" | "reject" | "cancel") => {
    if (!requestId) return;
    setActionLoading(action);
    setErr(null);
    try {
      const res = await fetch(`/api/client-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Aksi gagal (${res.status})`);
      }
      setReason("");
      await load();
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {loading && !detail ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : !detail ? (
          <div className="py-10 text-center text-sm text-gray-500">Data tidak ditemukan.</div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {TYPE_LABELS[detail.request_type]}
                <StatusBadge status={detail.status} />
              </SheetTitle>
              <SheetDescription>
                Dibuat {fmtDate(detail.created_at)} oleh{" "}
                <span className="font-medium text-gray-700">
                  {detail.agent_email ?? "agent"}
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Summary */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-2 text-sm">
              <Row
                label="Atas permintaan"
                value={`${RELATION_LABELS[detail.requested_by_relation]}${
                  detail.requested_by_name ? ` oleh ${detail.requested_by_name}` : ""
                }`}
              />
              {Object.entries(detail.payload ?? {}).map(([k, v]) => (
                <Row key={k} label={humanize(k)} value={String(v ?? "—")} />
              ))}
              {detail.notes && <Row label="Catatan" value={detail.notes} />}
              {detail.decided_at && (
                <>
                  <Row label="Diputuskan" value={fmtDate(detail.decided_at)} />
                  {detail.decided_reason && (
                    <Row label="Alasan" value={detail.decided_reason} />
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            {detail.status === "pending" && (
              <div className="mt-4 space-y-3">
                {mode === "hospital" && (
                  <>
                    <Input
                      placeholder="Alasan atau catatan. Wajib saat menolak."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={actionLoading !== null}
                        onClick={() => doAction("approve")}
                      >
                        {actionLoading === "approve" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        )}
                        Setujui
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                        disabled={actionLoading !== null || !reason.trim()}
                        onClick={() => doAction("reject")}
                      >
                        {actionLoading === "reject" ? (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-1.5" />
                        )}
                        Tolak
                      </Button>
                    </div>
                  </>
                )}
                {mode === "agent" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={actionLoading !== null}
                    onClick={() => doAction("cancel")}
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4 mr-1.5" />
                    )}
                    Batalkan Permintaan
                  </Button>
                )}
              </div>
            )}

            {err && (
              <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            {/* Audit trail */}
            <div className="mt-6">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                <HistoryIcon className="h-3.5 w-3.5" /> Jejak Digital
              </h4>
              <ol className="space-y-2 border-l-2 border-gray-100 pl-4">
                {detail.audit.map((a) => (
                  <li key={a.id} className="relative text-xs">
                    <span className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full bg-gray-400" />
                    <div className="font-medium text-gray-900">
                      {statusVerb(a.from_status, a.to_status)}
                    </div>
                    <div className="text-gray-500">
                      {fmtDate(a.created_at)} · oleh{" "}
                      <span className="font-medium">{a.by_email ?? "—"}</span>
                      {a.by_role ? ` (${a.by_role})` : ""}
                    </div>
                    {a.reason && (
                      <div className="mt-0.5 text-gray-600 italic">&quot;{a.reason}&quot;</div>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Messages */}
            <div className="mt-6">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                <MessageSquare className="h-3.5 w-3.5" /> Pesan
              </h4>
              {detail.messages.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada pesan.</p>
              ) : (
                <div className="space-y-2">
                  {detail.messages.map((m) => (
                    <div key={m.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                        {m.sender_email ?? "—"}
                        {m.sender_role ? ` · ${m.sender_role}` : ""} · {fmtDate(m.created_at)}
                      </div>
                      <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">
                        {m.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Compose */}
              {detail.status !== "cancelled" && (
                <div className="mt-3 flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Tulis pesan ke pihak lain..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={sending || !message.trim()}
                    className="shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:gap-2">
      <span className="text-[11px] uppercase tracking-wide text-gray-500 sm:text-xs sm:normal-case sm:tracking-normal sm:w-32 sm:shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 sm:flex-1 break-words">{value}</span>
    </div>
  );
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusVerb(from: ClientRequestStatus | null, to: ClientRequestStatus): string {
  if (from === null) return "Dibuat";
  if (to === "approved") return "Disetujui";
  if (to === "rejected") return "Ditolak";
  if (to === "cancelled") return "Dibatalkan";
  return `${STATUS_LABELS[from]} lalu ${STATUS_LABELS[to]}`;
}

// Unused-import guard (pending clock icon reserved for future use)
void Clock;
