"use client";

import { useEffect, useState } from "react";
import {
    FileText, Send, CheckCircle2, XCircle, AlertCircle, Upload, Clock,
    Loader2, Building2, ShieldCheck, UserCheck, History, MessageSquare,
    FileCheck, ArrowRight, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TimelineEvent = {
    timeline_id?: string;
    claim_id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    note?: string | null;
    extra_data?: Record<string, unknown> | null;
    actor_user_id?: string | null;
    actor_name?: string | null;
    actor_role?: string | null;
    created_at: string;
};

type EventMeta = {
    label: string;
    tone: string;   // icon + accent color
    Icon: React.ElementType;
};

/* ─── Event type → presentation mapping ──────────────────── */
const EVENT_META: Record<string, EventMeta> = {
    STATUS_CHANGE:         { label: "Status Diperbarui",       tone: "text-gray-600 bg-gray-100",       Icon: RefreshCw },
    SEND_TO_HOSPITAL:      { label: "Dikirim ke Rumah Sakit",  tone: "text-blue-700 bg-blue-100",       Icon: Building2 },
    SEND_TO_AGENT:         { label: "Dikembalikan ke Agen",    tone: "text-indigo-700 bg-indigo-100",   Icon: UserCheck },
    SUBMIT_TO_AGENCY:      { label: "Dikirim ke Agency",       tone: "text-violet-700 bg-violet-100",   Icon: Send },
    APPROVE:               { label: "Disetujui",               tone: "text-emerald-700 bg-emerald-100", Icon: CheckCircle2 },
    REJECT:                { label: "Ditolak",                 tone: "text-red-700 bg-red-100",         Icon: XCircle },
    INFO_REQUESTED:        { label: "Permintaan Info Tambahan",tone: "text-amber-700 bg-amber-100",     Icon: MessageSquare },
    INFO_SUBMITTED:        { label: "Info Tambahan Dikirim",   tone: "text-amber-700 bg-amber-100",     Icon: FileCheck },
    DOCUMENT_UPLOADED:     { label: "Dokumen Diunggah",        tone: "text-sky-700 bg-sky-100",         Icon: Upload },
    LOG_ISSUED:            { label: "LOG Diterbitkan",         tone: "text-teal-700 bg-teal-100",       Icon: FileText },
    LOG_SENT_TO_HOSPITAL:  { label: "LOG Dikirim ke RS",       tone: "text-teal-700 bg-teal-100",       Icon: Send },
    CLAIM_CREATED:         { label: "Klaim Dibuat",            tone: "text-gray-600 bg-gray-100",       Icon: FileText },
    CLAIM_SUBMITTED:       { label: "Klaim Disubmit",          tone: "text-violet-700 bg-violet-100",   Icon: ShieldCheck },
};

const roleLabel = (r?: string | null) => {
    if (!r) return "";
    const map: Record<string, string> = {
        agent: "Agen",
        agent_manager: "Agent Manager",
        admin_agency: "Admin Agency",
        insurance_admin: "Insurance Admin",
        hospital_admin: "Rumah Sakit",
        super_admin: "Super Admin",
        developer: "Developer",
    };
    return map[r] ?? r;
};

const fmtWhen = (iso: string) => {
    const d = new Date(iso);
    const now = Date.now();
    const diffMin = Math.floor((now - d.getTime()) / 60000);
    if (diffMin < 1) return "baru saja";
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} jam lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        + " • " + d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const getMeta = (event_type: string): EventMeta =>
    EVENT_META[event_type] ?? {
        label: event_type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        tone: "text-gray-600 bg-gray-100",
        Icon: History,
    };

/* ─── Component ──────────────────────────────────────────── */
export function ClaimTimeline({
    claimId,
    compact = false,
    showHeader = true,
}: { claimId: string; compact?: boolean; showHeader?: boolean }) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancel = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/claims/${claimId}/timeline`, { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || "Gagal memuat timeline");
                if (!cancel) setEvents(json.events || []);
            } catch (e) {
                if (!cancel) setError(e instanceof Error ? e.message : "Gagal memuat timeline");
            } finally {
                if (!cancel) setLoading(false);
            }
        };
        load();
        return () => { cancel = true; };
    }, [claimId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat jejak klaim…
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="text-center py-10 text-sm text-gray-500">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                Belum ada aktivitas pada klaim ini.
            </div>
        );
    }

    return (
        <div className={cn("w-full", compact ? "" : "space-y-4")}>
            {showHeader && (
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-4 h-4 text-gray-500" /> Riwayat Klaim
                    </h3>
                    <span className="text-[11px] font-semibold text-gray-400">
                        {events.length} aktivitas
                    </span>
                </div>
            )}

            <ol className="relative border-l-2 border-gray-100 ml-3">
                {events.map((e, i) => {
                    const meta = getMeta(e.event_type);
                    const isLast = i === events.length - 1;
                    return (
                        <li key={e.timeline_id ?? `${e.event_type}-${e.created_at}-${i}`}
                            className={cn("ml-6 pb-5", isLast && "pb-0")}>
                            <span className={cn(
                                "absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white",
                                meta.tone
                            )}>
                                <meta.Icon className="w-3 h-3" />
                            </span>

                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                                        {e.from_status && e.to_status && (
                                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-gray-600">
                                                {e.from_status} <ArrowRight className="w-3 h-3" /> {e.to_status}
                                            </span>
                                        )}
                                        {!e.from_status && e.to_status && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 text-gray-600">
                                                Status baru {e.to_status}
                                            </span>
                                        )}
                                    </div>
                                    {e.note && (
                                        <p className="text-[13px] text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{e.note}</p>
                                    )}
                                    {e.extra_data && Object.keys(e.extra_data).length > 0 && !compact && (
                                        <ExtraData data={e.extra_data} />
                                    )}
                                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1.5">
                                        {e.actor_name && (
                                            <span className="font-medium text-gray-500">{e.actor_name}</span>
                                        )}
                                        {e.actor_role && (
                                            <span className="px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100 font-semibold text-[9px] text-gray-500">
                                                {roleLabel(e.actor_role)}
                                            </span>
                                        )}
                                        <span>•</span>
                                        <time dateTime={e.created_at}>{fmtWhen(e.created_at)}</time>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}

/* ─── Collapsible extra data (key=value table) ──────────── */
function ExtraData({ data }: { data: Record<string, unknown> }) {
    const [open, setOpen] = useState(false);
    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== "");
    if (entries.length === 0) return null;
    const preview = entries.slice(0, 2);
    return (
        <div className="mt-2 text-[11px]">
            {!open ? (
                <button
                    onClick={() => setOpen(true)}
                    className="text-gray-500 hover:text-gray-800 font-medium"
                >
                    Lihat detail ({entries.length} field)
                </button>
            ) : (
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-2 space-y-0.5">
                    {entries.map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                            <span className="text-gray-400 shrink-0">{k}:</span>
                            <span className="text-gray-700 truncate">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                        </div>
                    ))}
                    <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-800 font-medium pt-1">
                        Tutup
                    </button>
                </div>
            )}
            {!open && (
                <span className="text-gray-400 ml-1">
                    · {preview.map(([k]) => k).join(", ")}
                </span>
            )}
        </div>
    );
}
