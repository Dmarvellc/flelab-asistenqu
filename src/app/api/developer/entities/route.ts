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
    const type = searchParams.get("type") ?? "agencies"; // agencies | hospitals
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "15");
    const search = searchParams.get("search") ?? "";
    const offset = (page - 1) * limit;

    const client = await dbPool.connect();
    try {
        if (type === "agencies") {
            const whereClause = search ? `WHERE a.name ILIKE $1` : "";
            const params: (string | number)[] = search ? [`%${search}%`] : [];

            const countRes = await client.query(
                `SELECT COUNT(*) FROM public.agency a ${whereClause}`,
                params
            );
            const total = parseInt(countRes.rows[0].count);

            const dataRes = await client.query(
                `
                WITH page_agencies AS (
                    SELECT a.agency_id, a.name, a.address, a.created_at
                    FROM public.agency a
                    ${whereClause}
                    ORDER BY a.created_at DESC
                    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                )
                SELECT
                    pa.agency_id,
                    pa.name,
                    pa.address,
                    pa.created_at,
                    COALESCE(usr.active_agents, 0) AS active_agents,
                    COALESCE(usr.total_agents, 0)  AS total_agents,
                    COALESCE(usr.admins, 0)        AS admins,
                    COALESCE(clm.total_claims, 0)  AS total_claims,
                    COALESCE(clm.approved_claims, 0) AS approved_claims
                FROM page_agencies pa
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*) FILTER (WHERE u.role = 'agent' AND u.status = 'ACTIVE')::int AS active_agents,
                        COUNT(*) FILTER (WHERE u.role = 'agent')::int AS total_agents,
                        COUNT(*) FILTER (WHERE u.role = 'admin_agency')::int AS admins
                    FROM public.app_user u
                    WHERE u.agency_id = pa.agency_id
                ) usr ON TRUE
                LEFT JOIN LATERAL (
                    SELECT
                        COUNT(*)::int AS total_claims,
                        COUNT(*) FILTER (WHERE c.stage IN ('APPROVED', 'COMPLETED'))::int AS approved_claims
                    FROM public.claim c
                    WHERE c.agency_id = pa.agency_id
                ) clm ON TRUE
                ORDER BY pa.created_at DESC
                `,
                [...params, limit, offset]
            ).catch(async () => {
                // Fallback: claim table may not exist yet.
                return client.query(
                    `
                    WITH page_agencies AS (
                        SELECT a.agency_id, a.name, a.address, a.created_at
                        FROM public.agency a
                        ${whereClause}
                        ORDER BY a.created_at DESC
                        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                    )
                    SELECT
                        pa.agency_id,
                        pa.name,
                        pa.address,
                        pa.created_at,
                        COALESCE(usr.active_agents, 0) AS active_agents,
                        COALESCE(usr.total_agents, 0)  AS total_agents,
                        COALESCE(usr.admins, 0)        AS admins,
                        0 AS total_claims,
                        0 AS approved_claims
                    FROM page_agencies pa
                    LEFT JOIN LATERAL (
                        SELECT
                            COUNT(*) FILTER (WHERE u.role = 'agent' AND u.status = 'ACTIVE')::int AS active_agents,
                            COUNT(*) FILTER (WHERE u.role = 'agent')::int AS total_agents,
                            COUNT(*) FILTER (WHERE u.role = 'admin_agency')::int AS admins
                        FROM public.app_user u
                        WHERE u.agency_id = pa.agency_id
                    ) usr ON TRUE
                    ORDER BY pa.created_at DESC
                    `,
                    [...params, limit, offset]
                );
            });

            return NextResponse.json({
                data: dataRes.rows,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        }

        if (type === "hospitals") {
            const whereClause = search ? `WHERE h.name ILIKE $1` : "";
            const params: (string | number)[] = search ? [`%${search}%`] : [];

            const countRes = await client.query(
                `SELECT COUNT(*) FROM public.hospital h ${whereClause}`,
                params
            );
            const total = parseInt(countRes.rows[0].count);

            const dataRes = await client.query(
                `
                WITH page_hospitals AS (
                    SELECT h.hospital_id, h.name, h.address, h.created_at
                    FROM public.hospital h
                    ${whereClause}
                    ORDER BY h.created_at DESC
                    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                )
                SELECT
                    ph.hospital_id,
                    ph.name,
                    ph.address,
                    ph.created_at,
                    COALESCE(ua.admin_count, 0) AS admin_count,
                    COALESCE(pr.patient_requests, 0) AS patient_requests
                FROM page_hospitals ph
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS admin_count
                    FROM public.user_role ur
                    WHERE ur.scope_type = 'HOSPITAL'
                      AND ur.scope_id = ph.hospital_id
                ) ua ON TRUE
                LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS patient_requests
                    FROM public.patient_data_request pdr
                    WHERE pdr.hospital_id = ph.hospital_id
                ) pr ON TRUE
                ORDER BY ph.created_at DESC
                `,
                [...params, limit, offset]
            ).catch(async () => {
                // Fallback without patient_data_request table.
                return client.query(
                    `
                    WITH page_hospitals AS (
                        SELECT h.hospital_id, h.name, h.address, h.created_at
                        FROM public.hospital h
                        ${whereClause}
                        ORDER BY h.created_at DESC
                        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
                    )
                    SELECT
                        ph.hospital_id,
                        ph.name,
                        ph.address,
                        ph.created_at,
                        COALESCE(ua.admin_count, 0) AS admin_count,
                        0 AS patient_requests
                    FROM page_hospitals ph
                    LEFT JOIN LATERAL (
                        SELECT COUNT(*)::int AS admin_count
                        FROM public.user_role ur
                        WHERE ur.scope_type = 'HOSPITAL'
                          AND ur.scope_id = ph.hospital_id
                    ) ua ON TRUE
                    ORDER BY ph.created_at DESC
                    `,
                    [...params, limit, offset]
                );
            });

            return NextResponse.json({
                data: dataRes.rows,
                meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
            });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error) {
        console.error("Entities fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 });
    } finally {
        client.release();
    }
}
