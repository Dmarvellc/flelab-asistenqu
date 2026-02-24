import { NextResponse } from "next/server";
import { reassignClient } from "@/services/admin-agency";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!userIdCookie) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { clientId, newAgentId } = await req.json();

        if (!clientId || !newAgentId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate that the admin has permission (e.g., both client and new agent belong to the admin's agency)
        const client = await dbPool.connect();
        try {
            const adminRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userIdCookie.value]);
            const agencyId = adminRes.rows[0]?.agency_id;

            if (!agencyId) {
                return NextResponse.json({ error: "Unauthorized Agency" }, { status: 403 });
            }

            // Check if New Agent is in the same agency
            const agentRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [newAgentId]);
            if (agentRes.rows.length === 0 || agentRes.rows[0].agency_id !== agencyId) {
                return NextResponse.json({ error: "Target agent is not in your agency" }, { status: 400 });
            }

            // Check if Client currently belongs to an agent in the admin's agency
            const clientOwnerRes = await client.query(`
                SELECT au.agency_id 
                FROM client c
                JOIN app_user au ON c.agent_id = au.user_id
                WHERE c.client_id = $1
            `, [clientId]);

            if (clientOwnerRes.rows.length === 0 || clientOwnerRes.rows[0].agency_id !== agencyId) {
                return NextResponse.json({ error: "Client does not belong to your agency" }, { status: 403 });
            }
        } finally {
            client.release();
        }

        await reassignClient(clientId, newAgentId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reassign Client Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
