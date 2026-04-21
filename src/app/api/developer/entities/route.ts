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
                `SELECT
          a.agency_id,
          a.name,
          a.address,
          a.created_at,
          COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'agent' AND u.status = 'ACTIVE') AS active_agents,
          COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'agent') AS total_agents,
          COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'admin_agency') AS admins,
          COUNT(DISTINCT c.claim_id) AS total_claims,
          COUNT(DISTINCT c.claim_id) FILTER (WHERE c.stage = 'APPROVED' OR c.stage = 'COMPLETED') AS approved_claims
        FROM public.agency a
        LEFT JOIN public.app_user u ON u.agency_id = a.agency_id
        LEFT JOIN public.claim c ON c.agency_id = a.agency_id
        ${whereClause}
        GROUP BY a.agency_id, a.name, a.address, a.created_at
        ORDER BY a.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                [...params, limit, offset]
            ).catch(async () => {
                // Fallback: public.claim table may not exist yet — return 0 for claim columns
                return client.query(
                    `SELECT
              a.agency_id,
              a.name,
              a.address,
              a.created_at,
              COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'agent' AND u.status = 'ACTIVE') AS active_agents,
              COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'agent') AS total_agents,
              COUNT(DISTINCT u.user_id) FILTER (WHERE u.role = 'admin_agency') AS admins,
              0 AS total_claims,
              0 AS approved_claims
            FROM public.agency a
            LEFT JOIN public.app_user u ON u.agency_id = a.agency_id
            ${whereClause}
            GROUP BY a.agency_id, a.name, a.address, a.created_at
            ORDER BY a.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
                `SELECT
          h.hospital_id,
          h.name,
          h.address,
          h.created_at,
          COUNT(DISTINCT ur.user_id) AS admin_count,
          COUNT(DISTINCT pr.request_id) AS patient_requests
        FROM public.hospital h
        LEFT JOIN public.user_role ur ON ur.scope_id = h.hospital_id AND ur.scope_type = 'HOSPITAL'
        LEFT JOIN public.patient_data_request pr ON pr.hospital_id = h.hospital_id
        ${whereClause}
        GROUP BY h.hospital_id, h.name, h.address, h.created_at
        ORDER BY h.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
                [...params, limit, offset]
            ).catch(async () => {
                // Fallback without patient_data_request if table doesn't exist
                return client.query(
                    `SELECT
            h.hospital_id,
            h.name,
            h.address,
            h.created_at,
            COUNT(DISTINCT ur.user_id) AS admin_count,
            0 AS patient_requests
          FROM public.hospital h
          LEFT JOIN public.user_role ur ON ur.scope_id = h.hospital_id AND ur.scope_type = 'HOSPITAL'
          ${whereClause}
          GROUP BY h.hospital_id, h.name, h.address, h.created_at
          ORDER BY h.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
