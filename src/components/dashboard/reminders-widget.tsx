"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Bell, Cake, CalendarClock, CreditCard, FileWarning, CalendarCheck,
    AlertTriangle, ArrowRight, Loader2, Inbox,
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
    title: string;
    due_date: string;
    days_until: number;
}

const TYPE_ICON: Record<ReminderType, React.ElementType> = {
    BIRTHDAY: Cake,
    PREMIUM_DUE: CalendarClock,
    AUTODEBET_EXPIRING: CreditCard,
    POLICY_EXPIRING: FileWarning,
    LAPSE_RISK: AlertTriangle,
    APPOINTMENT: CalendarCheck,
};

const TYPE_TONE: Record<ReminderType, string> = {
    BIRTHDAY: "text-pink-600 bg-pink-50",
    PREMIUM_DUE: "text-amber-600 bg-amber-50",
    AUTODEBET_EXPIRING: "text-orange-600 bg-orange-50",
    POLICY_EXPIRING: "text-blue-600 bg-blue-50",
    LAPSE_RISK: "text-red-600 bg-red-50",
    APPOINTMENT: "text-emerald-600 bg-emerald-50",
};

const SEV_DOT: Record<ReminderSeverity, string> = {
    OVERDUE: "bg-red-500",
    TODAY: "bg-gray-900",
    SOON: "bg-amber-500",
    UPCOMING: "bg-gray-300",
};

export function RemindersWidget() {
    const [items, setItems] = useState<ReminderItem[] | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancel = false;
        (async () => {
            try {
                const res = await fetch("/api/agent/reminders?horizon=30&limit=5", { cache: "no-store" });
                const json = await res.json();
                if (!cancel && res.ok) {
                    setItems(json.items || []);
                    setTotal(json.summary?.total ?? 0);
                }
            } catch { /* silent */ }
            finally { if (!cancel) setLoading(false); }
        })();
        return () => { cancel = true; };
    }, []);

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm">
                        <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Pengingat</h2>
                        <p className="text-[11px] text-gray-400">
                            {loading ? "Memuat…" : total === 0 ? "Semua aman 30 hari ke depan" : `${total} item dalam 30 hari`}
                        </p>
                    </div>
                </div>
                <Link
                    href="/agent/reminders"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-all"
                >
                    Lihat Semua <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            <div className="p-3">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Memuat pengingat…
                    </div>
                ) : !items || items.length === 0 ? (
                    <div className="text-center py-8">
                        <Inbox className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Tidak ada pengingat mendesak</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {items.map((it, i) => {
                            const Icon = TYPE_ICON[it.type];
                            return (
                                <li key={`${it.type}-${it.client_id}-${i}`}>
                                    <Link
                                        href="/agent/reminders"
                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                                    >
                                        <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${TYPE_TONE[it.type]}`}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{it.client_name}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{it.title}</p>
                                        </div>
                                        <span className="shrink-0 flex items-center gap-1.5">
                                            <span className={`h-1.5 w-1.5 rounded-full ${SEV_DOT[it.severity]}`} />
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                                {it.severity === "OVERDUE"
                                                    ? `${Math.abs(it.days_until)}h lewat`
                                                    : it.days_until === 0
                                                        ? "hari ini"
                                                        : `${it.days_until}h lagi`}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
