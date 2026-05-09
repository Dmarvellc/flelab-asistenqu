import { NextResponse } from "next/server";
import { reassignClient } from "@/services/admin-agency";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminRoles = ["admin_agency", "insurance_admin", "super_admin"];
  if (!adminRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.userId;
  const agencyId = session.agencyId;
  if (!agencyId) return NextResponse.json({ error: "Akun tidak terhubung ke agensi" }, { status: 403 });

  const { clientId, newAgentId } = await req.json();
  if (!clientId || !newAgentId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const dbClient = await dbPool.connect();
  try {
    // Verifikasi agent target ada di agensi yang sama
    const agentRes = await dbClient.query(
      "SELECT agency_id FROM public.app_user WHERE user_id = $1",
      [newAgentId],
    );
    if (agentRes.rows.length === 0 || agentRes.rows[0].agency_id !== agencyId) {
      return NextResponse.json({ error: "Target agent is not in your agency" }, { status: 400 });
    }

    // Verifikasi client milik agensi ini — handle unassigned (agent_id NULL) via created_by_user_id
    const clientRes = await dbClient.query(
      `SELECT
         COALESCE(au.agency_id, ac.agency_id) AS agency_id
       FROM public.client c
       LEFT JOIN public.app_user au ON c.agent_id = au.user_id
       LEFT JOIN public.app_user ac ON c.created_by_user_id = ac.user_id
       WHERE c.client_id = $1`,
      [clientId],
    );

    if (clientRes.rows.length === 0 || clientRes.rows[0].agency_id !== agencyId) {
      return NextResponse.json({ error: "Client does not belong to your agency" }, { status: 403 });
    }
  } finally {
    dbClient.release();
  }

  try {
    // Pass userId agar audit log tercatat
    await reassignClient(clientId, newAgentId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reassign Client Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
