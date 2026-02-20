import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { action } = await req.json();
        const { id: requestId } = await context.params;
        // Get admin ID from cookie/auth context if possible
        const adminId = "system";

        const client = await dbPool.connect();
        try {
            await client.query("BEGIN");

            if (action === "APPROVE") {
                // Get request details
                const reqRes = await client.query("SELECT agent_id, to_agency_id FROM agency_transfer_request WHERE request_id = $1 AND status = 'PENDING'", [requestId]);
                if (reqRes.rows.length === 0) {
                    await client.query("ROLLBACK");
                    return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 });
                }
                const { agent_id, to_agency_id } = reqRes.rows[0];

                // Update Request Status
                await client.query("UPDATE agency_transfer_request SET status = 'APPROVED', reviewed_at = NOW() WHERE request_id = $1", [requestId]);

                // Update User Agency
                await client.query("UPDATE app_user SET agency_id = $1 WHERE user_id = $2", [to_agency_id, agent_id]);
            } else if (action === "REJECT") {
                await client.query("UPDATE agency_transfer_request SET status = 'REJECTED', reviewed_at = NOW() WHERE request_id = $1", [requestId]);
            } else {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
            }

            await client.query("COMMIT");
            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Transfer Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
