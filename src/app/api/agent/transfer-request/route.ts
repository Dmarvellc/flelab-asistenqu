import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { headers } from "next/headers";

export async function POST(req: Request) {
    const headersList = await headers();
    // In a real app, middleware sets this; or we rely on session cookies.
    // For now, let's trust the cookie or parse it.
    // But wait, our middleware protects routes, but doesn't pass user_id in headers easily unless we modify middleware.
    // We can read the cookie directly here.
    const cookieStore = headersList.get("cookie") || "";
    const userIdMatch = cookieStore.match(/session_agent_user_id=([^;]+)/);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { targetAgencyId, reason } = await req.json();

        if (!targetAgencyId) {
            return NextResponse.json({ error: "Target Agency is required" }, { status: 400 });
        }

        const client = await dbPool.connect();
        try {
            // Check if user already has a pending request
            const pendingCheck = await client.query(
                "SELECT request_id FROM agency_transfer_request WHERE agent_id = $1 AND status = 'PENDING'",
                [userId]
            );

            if (pendingCheck.rows.length > 0) {
                return NextResponse.json({ error: "You already have a pending transfer request." }, { status: 400 });
            }

            // Get current agency
            const userRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userId]);
            const currentAgencyId = userRes.rows[0]?.agency_id;

            if (currentAgencyId === targetAgencyId) {
                return NextResponse.json({ error: "You are already in this agency." }, { status: 400 });
            }

            await client.query(
                `INSERT INTO agency_transfer_request 
        (agent_id, from_agency_id, to_agency_id, request_reason, status)
        VALUES ($1, $2, $3, $4, 'PENDING')`,
                [userId, currentAgencyId, targetAgencyId, reason]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Transfer Request Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
