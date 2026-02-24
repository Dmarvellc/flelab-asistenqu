import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    const cookieStore = await cookies();
    const adminIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!adminIdCookie) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUserId = adminIdCookie.value;
    const resolvedParams = await params;
    const targetUserId = resolvedParams.userId;

    const client = await dbPool.connect();
    try {
        // 1. Verify admin is authorized for this agency
        const adminRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [adminUserId]);
        const adminAgencyId = adminRes.rows[0]?.agency_id;

        if (!adminAgencyId) {
            return NextResponse.json({ error: "Admin has no agency" }, { status: 403 });
        }

        // 2. Verify the target agent belongs to this agency
        const agentRes = await client.query("SELECT user_id, agency_id FROM app_user WHERE user_id = $1 AND role = 'agent'", [targetUserId]);
        if (agentRes.rows.length === 0) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        const agentAgencyId = agentRes.rows[0].agency_id;
        if (agentAgencyId !== adminAgencyId) {
            return NextResponse.json({ error: "Agent belongs to a different agency" }, { status: 403 });
        }

        // 3. Update the agent's status to ACTIVE
        await client.query(`
            UPDATE app_user 
            SET status = 'ACTIVE', approved_at = NOW(), approved_by = $1
            WHERE user_id = $2
        `, [adminUserId, targetUserId]);

        // 4. Update agent core table status as well
        await client.query(`
            UPDATE agent
            SET status = 'ACTIVE'
            WHERE agent_id = $1
        `, [targetUserId]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Approve Agent Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    } finally {
        client.release();
    }
}
