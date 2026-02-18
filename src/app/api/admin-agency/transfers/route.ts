import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!userIdCookie) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await dbPool.connect();
    try {
        // 1. Get Admin's Agency
        const adminRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userIdCookie.value]);
        const agencyId = adminRes.rows[0]?.agency_id;

        if (!agencyId) {
            return NextResponse.json({ error: "Admin has no agency" }, { status: 403 });
        }

        // 2. Fetch Requests for this agency
        // Only requests to JOIN this agency (to_agency_id) are relevant for approval.
        const result = await client.query(`
            SELECT 
                tr.request_id,
                tr.agent_id,
                COALESCE(p.full_name, u.email) as agent_name,
                a1.name as from_agency_name,
                a2.name as to_agency_name,
                tr.status,
                tr.request_reason,
                tr.requested_at
            FROM agency_transfer_request tr
            JOIN app_user u ON tr.agent_id = u.user_id
            LEFT JOIN user_person_link upl ON u.user_id = upl.user_id
            LEFT JOIN person p ON upl.person_id = p.person_id
            LEFT JOIN agency a1 ON tr.from_agency_id = a1.agency_id
            JOIN agency a2 ON tr.to_agency_id = a2.agency_id
            WHERE tr.status = 'PENDING' AND tr.to_agency_id = $1
            ORDER BY tr.requested_at DESC
        `, [agencyId]);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Fetch Transfers Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    } finally {
        client.release();
    }
}
