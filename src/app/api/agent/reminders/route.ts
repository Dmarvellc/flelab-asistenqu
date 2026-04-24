import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export type ReminderType =
    | "BIRTHDAY"
    | "PREMIUM_DUE"
    | "AUTODEBET_EXPIRING"
    | "POLICY_EXPIRING"
    | "LAPSE_RISK"
    | "APPOINTMENT";

export type ReminderSeverity = "TODAY" | "SOON" | "UPCOMING" | "OVERDUE";

export interface ReminderItem {
    type: ReminderType;
    severity: ReminderSeverity;
    client_id: string;
    client_name: string;
    contract_id?: string | null;
    title: string;
    subtitle?: string | null;
    due_date: string;      // ISO date
    days_until: number;    // negative if overdue
    amount?: number | null;
    phone?: string | null;
    href?: string | null;
    meta?: Record<string, unknown>;
}

type ReminderPayload = {
    items: ReminderItem[];
    summary: {
        total: number;
        by_type: Record<string, number>;
        by_severity: Record<string, number>;
    };
    horizon: number;
};

/* ─── Severity bucketing (centralized) ─────────────────── */
function severityFor(daysUntil: number, overdueAllowed = false): ReminderSeverity {
    if (daysUntil < 0) return overdueAllowed ? "OVERDUE" : "TODAY";
    if (daysUntil === 0) return "TODAY";
    if (daysUntil <= 7) return "SOON";
    return "UPCOMING";
}

export async function GET(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const horizon = Math.min(Math.max(parseInt(url.searchParams.get("horizon") ?? "30", 10) || 30, 1), 365);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1), 500);
    const typeFilter = url.searchParams.get("type") as ReminderType | null;

    const agentId = session.userId;
    const cacheKey = `v1:agent:reminders:${agentId}:h${horizon}:l${limit}:t${typeFilter ?? "ALL"}`;
    try {
        const payload = await cached<ReminderPayload>(
            cacheKey,
            30,
            async () => {
                const client = await dbPool.connect();
                try {
                    const items: ReminderItem[] = [];
        /* ─── 1. BIRTHDAYS (year-agnostic month/day match) ──── */
                    if (!typeFilter || typeFilter === "BIRTHDAY") {
                        const res = await client.query(
                `
                WITH birthdays AS (
                    SELECT
                        c.client_id,
                        p.full_name,
                        p.phone_number,
                        p.birth_date,
                        /* This year's birthday */
                        (DATE_TRUNC('year', CURRENT_DATE)
                            + (p.birth_date - DATE_TRUNC('year', p.birth_date)))::date AS bd_this_year
                    FROM public.client c
                    JOIN public.person p ON c.person_id = p.person_id
                    WHERE c.agent_id = $1
                      AND p.birth_date IS NOT NULL
                )
                SELECT
                    client_id,
                    full_name,
                    phone_number,
                    birth_date,
                    CASE
                        WHEN bd_this_year < CURRENT_DATE
                            THEN (bd_this_year + INTERVAL '1 year')::date
                        ELSE bd_this_year
                    END AS next_birthday
                FROM birthdays
                WHERE
                    CASE
                        WHEN bd_this_year < CURRENT_DATE
                            THEN (bd_this_year + INTERVAL '1 year')::date
                        ELSE bd_this_year
                    END <= CURRENT_DATE + ($2 || ' days')::interval
                ORDER BY next_birthday ASC
                `,
                [agentId, horizon]
            );

                        for (const r of res.rows) {
                            const due = new Date(r.next_birthday);
                            const days = Math.floor((due.getTime() - Date.now()) / 86400000);
                            const bdate = new Date(r.birth_date);
                            const age = due.getFullYear() - bdate.getFullYear();
                            items.push({
                                type: "BIRTHDAY",
                                severity: severityFor(days),
                                client_id: r.client_id,
                                client_name: r.full_name,
                                title: days === 0 ? `Ulang tahun hari ini ${age > 0 ? `(${age} th)` : ""}` : `Ulang tahun ke-${age}`,
                                subtitle: `Kirim ucapan pribadi ke ${r.full_name}`,
                                due_date: due.toISOString().slice(0, 10),
                                days_until: days,
                                phone: r.phone_number,
                                href: `/agent/clients/${r.client_id}`,
                            });
                        }
                    }

        /* ─── 2. PREMIUM DUE & LAPSE RISK (both from next_due_date) ───────── */
                    if (!typeFilter || typeFilter === "PREMIUM_DUE" || typeFilter === "LAPSE_RISK") {
                        const res = await client.query(
                `
                SELECT
                    c.client_id,
                    p.full_name,
                    p.phone_number,
                    con.contract_id,
                    con.contract_product,
                    con.next_due_date,
                    con.grace_period_days,
                    con.policy_status,
                    cd.premium_amount,
                    (con.next_due_date - CURRENT_DATE)::int AS days_until
                FROM public.client c
                JOIN public.person p ON c.person_id = p.person_id
                JOIN public.contract con ON con.client_id = c.client_id
                LEFT JOIN public.contract_detail cd ON cd.contract_id = con.contract_id
                WHERE c.agent_id = $1
                  AND con.next_due_date IS NOT NULL
                  AND (
                      con.next_due_date <= CURRENT_DATE + ($2 || ' days')::interval
                  )
                ORDER BY con.next_due_date ASC
                `,
                [agentId, horizon]
            );

                        for (const r of res.rows) {
                            const days = Number(r.days_until);
                            const grace = Number(r.grace_period_days ?? 30);
                            const isLapse = days < -grace || r.policy_status === "LAPSE";
                            const type: ReminderType = days < 0 ? "LAPSE_RISK" : "PREMIUM_DUE";
                            if (typeFilter && typeFilter !== type) continue;

                            items.push({
                                type,
                                severity: isLapse ? "OVERDUE" : severityFor(days, true),
                                client_id: r.client_id,
                                client_name: r.full_name,
                                contract_id: r.contract_id,
                                title:
                                    days < 0
                                        ? isLapse
                                            ? `Polis LAPSE · lewat ${Math.abs(days)} hari`
                                            : `Jatuh tempo lewat ${Math.abs(days)} hari (grace ${grace}h)`
                                        : days === 0
                                            ? "Jatuh tempo hari ini"
                                            : `Jatuh tempo dalam ${days} hari`,
                                subtitle: r.contract_product ? `${r.contract_product}` : null,
                                due_date: new Date(r.next_due_date).toISOString().slice(0, 10),
                                days_until: days,
                                amount: r.premium_amount ? Number(r.premium_amount) : null,
                                phone: r.phone_number,
                                href: `/agent/clients/${r.client_id}`,
                                meta: { grace_period_days: grace, policy_status: r.policy_status },
                            });
                        }
                    }

        /* ─── 3. AUTODEBET EXPIRING ────────────────────────── */
                    if (!typeFilter || typeFilter === "AUTODEBET_EXPIRING") {
                        const res = await client.query(
                `
                SELECT
                    c.client_id,
                    p.full_name,
                    p.phone_number,
                    con.contract_id,
                    con.contract_product,
                    cd.autodebet_end_date,
                    cd.payment_method,
                    cd.bank_name,
                    cd.card_network,
                    (cd.autodebet_end_date - CURRENT_DATE)::int AS days_until
                FROM public.client c
                JOIN public.person p ON c.person_id = p.person_id
                JOIN public.contract con ON con.client_id = c.client_id
                JOIN public.contract_detail cd ON cd.contract_id = con.contract_id
                WHERE c.agent_id = $1
                  AND cd.autodebet_end_date IS NOT NULL
                  AND cd.autodebet_end_date <= CURRENT_DATE + ($2 || ' days')::interval
                  AND cd.autodebet_end_date >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY cd.autodebet_end_date ASC
                `,
                [agentId, horizon]
            );

                        for (const r of res.rows) {
                            const days = Number(r.days_until);
                            const method = String(r.payment_method ?? "");
                            const label = method.includes("KK") || method.includes("CARD")
                                ? `Kartu ${r.card_network ?? ""}`.trim()
                                : method.includes("REKENING")
                                    ? `Bank ${r.bank_name ?? ""}`.trim()
                                    : "Autodebet";
                            items.push({
                                type: "AUTODEBET_EXPIRING",
                                severity: severityFor(days, true),
                                client_id: r.client_id,
                                client_name: r.full_name,
                                contract_id: r.contract_id,
                                title: days < 0
                                    ? `${label} sudah expired ${Math.abs(days)} hari lalu`
                                    : days === 0 ? `${label} expired hari ini`
                                        : `${label} expired dalam ${days} hari`,
                                subtitle: r.contract_product,
                                due_date: new Date(r.autodebet_end_date).toISOString().slice(0, 10),
                                days_until: days,
                                phone: r.phone_number,
                                href: `/agent/clients/${r.client_id}`,
                            });
                        }
                    }

        /* ─── 4. POLICY EXPIRING (end_date) ────────────────── */
                    if (!typeFilter || typeFilter === "POLICY_EXPIRING") {
                        const res = await client.query(
                `
                SELECT
                    c.client_id,
                    p.full_name,
                    p.phone_number,
                    con.contract_id,
                    con.contract_product,
                    con.end_date,
                    (con.end_date - CURRENT_DATE)::int AS days_until
                FROM public.client c
                JOIN public.person p ON c.person_id = p.person_id
                JOIN public.contract con ON con.client_id = c.client_id
                WHERE c.agent_id = $1
                  AND con.end_date IS NOT NULL
                  AND con.end_date > CURRENT_DATE
                  AND con.end_date <= CURRENT_DATE + ($2 || ' days')::interval
                ORDER BY con.end_date ASC
                `,
                [agentId, Math.max(horizon, 60)]
            );

                        for (const r of res.rows) {
                            const days = Number(r.days_until);
                            items.push({
                                type: "POLICY_EXPIRING",
                                severity: severityFor(days),
                                client_id: r.client_id,
                                client_name: r.full_name,
                                contract_id: r.contract_id,
                                title: `Polis berakhir dalam ${days} hari`,
                                subtitle: r.contract_product ? `${r.contract_product} · peluang renewal` : "Peluang renewal",
                                due_date: new Date(r.end_date).toISOString().slice(0, 10),
                                days_until: days,
                                phone: r.phone_number,
                                href: `/agent/clients/${r.client_id}`,
                            });
                        }
                    }

        /* ─── 5. UPCOMING APPOINTMENTS ─────────────────────── */
                    if (!typeFilter || typeFilter === "APPOINTMENT") {
                        const res = await client.query(
                `
                SELECT
                    a.appointment_id,
                    a.appointment_date,
                    a.appointment_time,
                    a.appointment_type,
                    a.status,
                    a.notes,
                    c.client_id,
                    p.full_name,
                    p.phone_number,
                    (a.appointment_date - CURRENT_DATE)::int AS days_until
                FROM public.appointment a
                JOIN public.client c ON c.client_id = a.client_id
                JOIN public.person p ON p.person_id = c.person_id
                WHERE a.agent_user_id = $1
                  AND a.appointment_date >= CURRENT_DATE
                  AND a.appointment_date <= CURRENT_DATE + ($2 || ' days')::interval
                  AND COALESCE(a.status, 'SCHEDULED') IN ('SCHEDULED', 'CONFIRMED', 'PENDING')
                ORDER BY a.appointment_date ASC, a.appointment_time ASC NULLS LAST
                `,
                [agentId, horizon]
            ).catch(() => ({ rows: [] as Array<Record<string, unknown>> }));

                        for (const row of res.rows as Array<Record<string, unknown>>) {
                            const days = Number(row.days_until);
                            const date = new Date(row.appointment_date as string);
                            const time = row.appointment_time as string | null;
                            items.push({
                                type: "APPOINTMENT",
                                severity: severityFor(days),
                                client_id: row.client_id as string,
                                client_name: row.full_name as string,
                                title: days === 0
                                    ? `Janji temu hari ini${time ? ` • ${String(time).slice(0, 5)}` : ""}`
                                    : `Janji temu dalam ${days} hari${time ? ` • ${String(time).slice(0, 5)}` : ""}`,
                                subtitle: (row.appointment_type as string | null) ?? "Appointment",
                                due_date: date.toISOString().slice(0, 10),
                                days_until: days,
                                phone: row.phone_number as string | null,
                                href: `/agent/appointments`,
                                meta: { appointment_time: time, notes: row.notes, status: row.status },
                            });
                        }
                    }

                    /* ─── Sort: severity first, then days_until ─────── */
                    const sevWeight: Record<ReminderSeverity, number> = { OVERDUE: 0, TODAY: 1, SOON: 2, UPCOMING: 3 };
                    items.sort((a, b) => {
                        const s = sevWeight[a.severity] - sevWeight[b.severity];
                        if (s !== 0) return s;
                        return a.days_until - b.days_until;
                    });

                    const total = items.length;
                    const sliced = items.slice(0, limit);

                    const summary = {
                        total,
                        by_type: items.reduce<Record<string, number>>((acc, r) => {
                            acc[r.type] = (acc[r.type] ?? 0) + 1;
                            return acc;
                        }, {}),
                        by_severity: items.reduce<Record<string, number>>((acc, r) => {
                            acc[r.severity] = (acc[r.severity] ?? 0) + 1;
                            return acc;
                        }, {}),
                    };

                    return { items: sliced, summary, horizon };
                } finally {
                    client.release();
                }
            }
        );

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Agent reminders fetch failed", error);
        return NextResponse.json({ error: "Failed to load reminders" }, { status: 500 });
    }
}
