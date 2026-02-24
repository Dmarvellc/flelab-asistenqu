import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { action } = await req.json();
        const { id: requestId } = await context.params;

        // Secure Authentication Check
        const cookieStore = await cookies();
        const adminIdCookie = cookieStore.get("session_admin_agency_user_id");

        if (!adminIdCookie) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminId = adminIdCookie.value;

        const client = await dbPool.connect();
        try {
            await client.query("BEGIN");

            // Verify Admin Agency ID mapping
            const adminRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [adminId]);
            const adminAgencyId = adminRes.rows[0]?.agency_id;

            if (!adminAgencyId) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Admin has no agency" }, { status: 403 });
            }

            // Get request details
            const reqRes = await client.query("SELECT agent_id, to_agency_id FROM agency_transfer_request WHERE request_id = $1 AND status = 'PENDING'", [requestId]);
            if (reqRes.rows.length === 0) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Request not found or already processed" }, { status: 404 });
            }

            const { agent_id, to_agency_id } = reqRes.rows[0];

            // Verify the request destination matches admin's agency
            if (to_agency_id !== adminAgencyId) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "Cannot process transfer destined for another agency" }, { status: 403 });
            }

            if (action === "APPROVE") {
                // Update Request Status
                await client.query("UPDATE agency_transfer_request SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $2 WHERE request_id = $1", [requestId, adminId]);

                // Update User Agency
                await client.query("UPDATE app_user SET agency_id = $1 WHERE user_id = $2", [to_agency_id, agent_id]);
            } else if (action === "REJECT") {
                await client.query("UPDATE agency_transfer_request SET status = 'REJECTED', reviewed_at = NOW(), reviewed_by = $2 WHERE request_id = $1", [requestId, adminId]);
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
