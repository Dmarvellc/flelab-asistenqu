"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Bell, Cake, CalendarClock, CreditCard, FileWarning, CalendarCheck, AlertTriangle,
    RefreshCw, Loader2, Phone, ArrowUpRight, MessageCircle, Inbox,
} from "lucide-react";

type ReminderType =
    | "BIRTHDAY" | "PREMIUM_DUE" | "AUTODEBET_EXPIRING"
    | "POLICY_EXPIRING" | "LAPSE_RISK" | "APPOINTMENT";
type ReminderSeverity = "TODAY" | "SOON" | "UPCOMING" | "OVERDUE";

interface ReminderItem {
    type: ReminderType;
    severity: ReminderSeverity;
    client_id: string;
    client_name: string;
    contract_id?: string | null;
    title: string;
    subtitle?: string | null;
    due_date: string;
    days_until: number;
    amount?: number | null;
    phone?: string | null;
    href?: string | null;
    meta?: Record<string, unknown>;
}

interface ReminderResponse {
    items: ReminderItem[];
    summary: { total: number; by_type: Record<string, number>; by_severity: Record<string, number> };
    horizon: number;
}

const TYPE_META: Record<ReminderType, { label: string; Icon: React.ElementType; tone: string; ring: string }> = {
    BIRTHDAY:            { label: "Ulang Tahun",       Icon: Cake,           tone: "text-pink-700 bg-pink-50",       ring: "ring-pink-200" },
    PREMIUM_DUE:         { label: "Jatuh Tempo Premi", Icon: CalendarClock,  tone: "text-amber-700 bg-amber-50",     ring: "ring-amber-200" },
    AUTODEBET_EXPIRING:  { label: "Autodebet Expired", Icon: CreditCard,     tone: "text-orange-700 bg-orange-50",   ring: "ring-orange-200" },
    POLICY_EXPIRING:     { label: "Polis Berakhir",    Icon: FileWarning,    tone: "text-blue-700 bg-blue-50",       ring: "ring-blue-200" },
    LAPSE_RISK:          { label: "Lapse Risk",        Icon: AlertTriangle,  tone: "text-red-700 bg-red-50",         ring: "ring-red-200" },
    APPOINTMENT:         { label: "Janji Temu",        Icon: CalendarCheck,  tone: "text-emerald-700 bg-emerald-50", ring: "ring-emerald-200" },
};

const SEV_META: Record<ReminderSeverity, { label: string; cls: string }> = {
    OVERDUE:  { label: "TERLAMBAT",    cls: "bg-red-600 text-white" },
    TODAY:    { label: "HARI INI",     cls: "bg-gray-900 text-white" },
    SOON:     { label: "7 HARI",       cls: "bg-amber-500 text-white" },
    UPCOMING: { label: "MENDATANG",    cls: "bg-gray-100 text-gray-600" },
};

const idr = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

function sanitizePhone(p?: string | null) {
    if (!p) return null;
    const digits = p.replace(/\D/g, "");
    if (digits.startsWith("0")) return "62" + digits.slice(1);
    return digits;
}

function buildWaLink(phone: string, clientName: string, type: ReminderType, item: ReminderItem) {
    const to = sanitizePhone(phone);
    if (!to) return null;
    let text = "";
    switch (type) {
        case "BIRTHDAY":
            text = `Halo ${clientName}, selamat ulang tahun! Semoga panjang umur, sehat selalu, dan selalu dalam lindungan. Tim kami akan selalu siap mendampingi Anda.`;
            break;
        case "PREMIUM_DUE":
            text = `Halo ${clientName}, kami ingin mengingatkan bahwa premi polis Anda akan jatuh tempo pada ${fmtDate(item.due_date)}${item.amount ? ` sebesar ${idr(item.amount)}` : ""}. Mohon konfirmasi ya agar polis tetap aktif.`;
            break;
        case "LAPSE_RISK":
            text = `Halo ${clientName}, polis Anda sudah melewati masa tenggang pembayaran premi. Mohon hubungi kami segera agar kami bisa membantu reinstatement dan memastikan perlindungan tetap berjalan.`;
            break;
        case "AUTODEBET_EXPIRING":
            text = `Halo ${clientName}, metode autodebet Anda akan expired pada ${fmtDate(item.due_date)}. Yuk kita perbarui info pembayarannya agar pembayaran premi tidak gagal.`;
            break;
        case "POLICY_EXPIRING":
            text = `Halo ${clientName}, polis Anda akan berakhir pada ${fmtDate(item.due_date)}. Saya ingin membantu proses renewal sekaligus review kebutuhan perlindungan Anda.`;
            break;
        case "APPOINTMENT":
            text = `Halo ${clientName}, ini pengingat bahwa Anda memiliki janji temu pada ${fmtDate(item.due_date)}. Silakan konfirmasi kehadiran Anda.`;
            break;
    }
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

type FilterKey = "ALL" | ReminderType;

const FILTER_TABS: Array<{ key: FilterKey; label: string; Icon: React.ElementType }> = [
    { key: "ALL",                label: "Semua",         Icon: Inbox },
    { key: "BIRTHDAY",           label: "Ulang Tahun",   Icon: Cake },
    { key: "PREMIUM_DUE",        label: "Jatuh Tempo",   Icon: CalendarClock },
    { key: "LAPSE_RISK",         label: "Lapse Risk",    Icon: AlertTriangle },
    { key: "AUTODEBET_EXPIRING", label: "Autodebet",     Icon: CreditCard },
    { key: "POLICY_EXPIRING",    label: "Renewal",       Icon: FileWarning },
    { key: "APPOINTMENT",        label: "Janji Temu",    Icon: CalendarCheck },
];

export default function RemindersPage() {
    const [data, setData] = useState<ReminderResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>("ALL");
    const [horizon, setHorizon] = useState(30);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/agent/reminders?horizon=${horizon}`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Gagal memuat pengingat");
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Gagal memuat pengingat");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [horizon]);

    const filtered = useMemo(() => {
        if (!data) return [];
        if (filter === "ALL") return data.items;
        return data.items.filter(i => i.type === filter);
    }, [data, filter]);

    /* Group by day-bucket */
    const groups = useMemo(() => {
        const g: Record<string, ReminderItem[]> = { Terlambat: [], "Hari Ini": [], "7 Hari": [], Mendatang: [] };
        for (const i of filtered) {
            if (i.severity === "OVERDUE") g.Terlambat.push(i);
            else if (i.days_until === 0) g["Hari Ini"].push(i);
            else if (i.days_until <= 7) g["7 Hari"].push(i);
            else g.Mendatang.push(i);
        }
        return g;
    }, [filtered]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center shrink-0 shadow-md">
                        <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Pengingat</h1>
                        <p className="text-xs sm:text-sm text-gray-400">
                            Ulang tahun, jatuh tempo, autodebet, dan renewal dari klien Anda
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={horizon}
                        onChange={e => setHorizon(parseInt(e.target.value))}
                        className="text-xs font-medium bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none hover:border-gray-300"
                    >
                        <option value={7}>7 hari</option>
                        <option value={14}>14 hari</option>
                        <option value={30}>30 hari</option>
                        <option value={60}>60 hari</option>
                        <option value={90}>90 hari</option>
                    </select>
                    <button
                        onClick={load}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Summary cards per-type */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {(Object.keys(TYPE_META) as ReminderType[]).map(t => {
                    const meta = TYPE_META[t];
                    const count = data?.summary.by_type?.[t] ?? 0;
                    const active = filter === t;
                    return (
                        <button
                            key={t}
                            onClick={() => setFilter(active ? "ALL" : t)}
                            className={`text-left p-3 rounded-2xl border transition-all ${
                                active ? "bg-gray-900 border-gray-900 shadow-md" : "bg-white border-gray-100 hover:border-gray-200"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${active ? "bg-white/15" : meta.tone}`}>
                                    <meta.Icon className={`h-3.5 w-3.5 ${active ? "text-white" : ""}`} />
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-white/60" : "text-gray-300"}`}>
                                    {meta.label.split(" ")[0]}
                                </span>
                            </div>
                            <p className={`text-2xl font-black tabular-nums ${active ? "text-white" : "text-gray-900"}`}>{count}</p>
                            <p className={`text-[11px] ${active ? "text-white/70" : "text-gray-500"}`}>{meta.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {FILTER_TABS.map(({ key, label, Icon }) => {
                    const active = filter === key;
                    const count = key === "ALL" ? data?.summary.total ?? 0 : data?.summary.by_type?.[key] ?? 0;
                    return (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                active ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                            <span className={`text-[10px] tabular-nums font-bold ${active ? "text-white/70" : "text-gray-400"}`}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Body */}
            {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4" /> {error}
                </div>
            )}

            {loading && !data && (
                <div className="flex items-center justify-center py-20 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat pengingat…
                </div>
            )}

            {data && filtered.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-100">
                    <Inbox className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Tidak ada pengingat</p>
                    <p className="text-xs text-gray-400 mt-1">Semua aman untuk {horizon} hari ke depan.</p>
                </div>
            )}

            {data && filtered.length > 0 && (
                <div className="space-y-6">
                    {(["Terlambat", "Hari Ini", "7 Hari", "Mendatang"] as const).map(bucket => {
                        const items = groups[bucket];
                        if (!items || items.length === 0) return null;
                        return (
                            <section key={bucket}>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                                    {bucket} · <span className="tabular-nums text-gray-500">{items.length}</span>
                                </h2>
                                <div className="space-y-2">
                                    {items.map((it, idx) => (
                                        <ReminderRow key={`${it.type}-${it.client_id}-${it.contract_id ?? ""}-${idx}`} item={it} />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ─── Row ─────────────────────────────────────────────── */
function ReminderRow({ item }: { item: ReminderItem }) {
    const meta = TYPE_META[item.type];
    const sev = SEV_META[item.severity];
    const wa = item.phone ? buildWaLink(item.phone, item.client_name, item.type, item) : null;

    return (
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 hover:border-gray-200 hover:shadow-sm transition-all group">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.tone} ring-2 ring-white ${meta.ring}`}>
                <meta.Icon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.client_name}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${sev.cls}`}>
                        {sev.label}
                    </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                    {item.title}
                    {item.subtitle && <span className="text-gray-400"> · {item.subtitle}</span>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">
                    {fmtDate(item.due_date)}
                    {item.amount ? ` · ${idr(item.amount)}` : ""}
                </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {wa && (
                    <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`WhatsApp ${item.client_name}`}
                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-all"
                    >
                        <MessageCircle className="h-4 w-4" />
                    </a>
                )}
                {item.phone && (
                    <a
                        href={`tel:${item.phone}`}
                        title={`Telepon ${item.client_name}`}
                        className="hidden sm:inline-flex p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
                    >
                        <Phone className="h-4 w-4" />
                    </a>
                )}
                {item.href && (
                    <Link
                        href={item.href}
                        title="Buka detail"
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                    >
                        <ArrowUpRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
        </div>
    );
}
