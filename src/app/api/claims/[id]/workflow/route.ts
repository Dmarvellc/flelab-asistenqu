import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id: claimId } = await context.params;
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;
    // Get role from cookie for fast check, or fetch from DB to be secure.
    // We'll trust the cookie 'role' for now but verify via DB if critical.
    // Actually, let's fetch user from DB to get reliable role.

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = await dbPool.connect();
    try {
        const userRes = await client.query("SELECT role, agency_id FROM public.app_user WHERE user_id = $1", [userId]);
        if (userRes.rows.length === 0) return NextResponse.json({ error: "User not found" }, { status: 401 });

        const user = userRes.rows[0];
        const role = user.role;

        const { action, notes } = await req.json();

        // Fetch current claim
        const claimRes = await client.query("SELECT stage, status FROM public.claim WHERE claim_id = $1", [claimId]);
        if (claimRes.rows.length === 0) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        const claim = claimRes.rows[0];

        let newStage: string | undefined;
        let newStatus: string | undefined;
        let query = "";
        let queryParams: any[] = [];

        // State Machine
        if (action === "SEND_TO_HOSPITAL") {
            if (role !== "agent" && role !== "agent_manager") return NextResponse.json({ error: "Only agents can send to hospital" }, { status: 403 });
            // Can only send if DRAFT_AGENT or PENDING_AGENT (returned for revision)
            if (!["DRAFT_AGENT", "PENDING_AGENT"].includes(claim.stage)) {
                return NextResponse.json({ error: "Invalid claim stage for this action" }, { status: 400 });
            }
            newStage = "PENDING_HOSPITAL";
            newStatus = "IN_PROGRESS";
            query = "UPDATE public.claim SET stage = $1, status = $2, agent_notes = COALESCE(agent_notes, '') || E'\n' || $3, last_updated_by = $4 WHERE claim_id = $5";
            queryParams = [newStage, newStatus, notes || "", userId, claimId];

        } else if (action === "SEND_TO_AGENT") {
            // Assuming 'hospital_admin' role
            if (role !== "hospital_admin") return NextResponse.json({ error: "Only hospitals can send to agent" }, { status: 403 });
            if (claim.stage !== "PENDING_HOSPITAL" && claim.stage !== "DRAFT_HOSPITAL") return NextResponse.json({ error: "Invalid claim stage" }, { status: 400 });

            newStage = "PENDING_AGENT";
            newStatus = "IN_PROGRESS";
            query = "UPDATE public.claim SET stage = $1, status = $2, hospital_notes = COALESCE(hospital_notes, '') || E'\n' || $3, last_updated_by = $4 WHERE claim_id = $5";
            queryParams = [newStage, newStatus, notes || "", userId, claimId];

        } else if (action === "SUBMIT_TO_AGENCY") {
            // Agent submits finally
            if (role !== "agent") return NextResponse.json({ error: "Only agents can submit to agency" }, { status: 403 });
            if (claim.stage !== "PENDING_AGENT" && claim.stage !== "DRAFT_AGENT") return NextResponse.json({ error: "Invalid claim stage" }, { status: 400 });

            newStage = "SUBMITTED_TO_AGENCY";
            newStatus = "REVIEW";
            query = "UPDATE public.claim SET stage = $1, status = $2, agent_notes = COALESCE(agent_notes, '') || E'\n' || $3, last_updated_by = $4 WHERE claim_id = $5";
            queryParams = [newStage, newStatus, notes || "", userId, claimId];

        } else if (action === "APPROVE") {
            if (role !== "admin_agency" && role !== "insurance_admin" && role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            newStage = "APPROVED";
            newStatus = "APPROVED";
            query = "UPDATE public.claim SET stage = $1, status = $2, admin_review_notes = $3, last_updated_by = $4 WHERE claim_id = $5";
            queryParams = [newStage, newStatus, notes || "Approved", userId, claimId];

        } else if (action === "REJECT") {
            if (role !== "admin_agency" && role !== "insurance_admin" && role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

            newStage = "REJECTED";
            newStatus = "REJECTED";
            query = "UPDATE public.claim SET stage = $1, status = $2, admin_review_notes = $3, last_updated_by = $4 WHERE claim_id = $5";
            queryParams = [newStage, newStatus, notes || "Rejected", userId, claimId];
        } else {
            return NextResponse.json({ error: "Unknown Action" }, { status: 400 });
        }

        await client.query(query, queryParams);

        return NextResponse.json({ success: true, newStage, newStatus });

    } catch (error: any) {
        console.error("Workflow Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
