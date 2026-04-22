import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

export async function GET(request: Request) {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page   = parseInt(searchParams.get("page")   ?? "1");
    const limit  = parseInt(searchParams.get("limit")  ?? "20");
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const db = await dbPool.connect();
    try {
        const where = search
            ? `WHERE p.full_name ILIKE $1 OR ap.full_name ILIKE $1 OR a.name ILIKE $1`
            : "";
        const params: (string | number)[] = search ? [`%${search}%`] : [];

        const [countRes, dataRes] = await Promise.all([
            db.query(
                `SELECT COUNT(*)::int AS total
                 FROM public.client c
                 JOIN public.person p ON c.person_id = p.person_id
                 JOIN public.app_user au ON c.agent_id = au.user_id
                 LEFT JOIN public.user_person_link upl ON au.user_id = upl.user_id
                 LEFT JOIN public.person ap ON upl.person_id = ap.person_id
                 LEFT JOIN public.agency a ON au.agency_id = a.agency_id
                 ${where}`,
                params
            ),
            db.query(
                `SELECT
                    c.client_id,
                    p.full_name,
                    c.status,
                    c.created_at,
                    ap.full_name AS agent_name,
                    a.name AS agency_name,
                    (SELECT COUNT(*)::int FROM public.contract ct WHERE ct.client_id = c.client_id) AS total_policies,
                    (SELECT COUNT(*)::int FROM public.claim cl
                     JOIN public.contract ct ON cl.contract_id = ct.contract_id
                     WHERE ct.client_id = c.client_id) AS total_claims
                 FROM public.client c
                 JOIN public.person p ON c.person_id = p.person_id
                 JOIN public.app_user au ON c.agent_id = au.user_id
                 LEFT JOIN public.user_person_link upl ON au.user_id = upl.user_id
                 LEFT JOIN public.person ap ON upl.person_id = ap.person_id
                 LEFT JOIN public.agency a ON au.agency_id = a.agency_id
                 ${where}
                 ORDER BY c.created_at DESC
                 LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                [...params, limit, offset]
            ),
        ]);

        const total = countRes.rows[0]?.total ?? 0;
        return NextResponse.json({
            data: dataRes.rows,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error("developer/clients error:", err);
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
    } finally {
        db.release();
    }
}
