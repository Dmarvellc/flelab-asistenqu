import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId =
      cookieStore.get("session_agent_user_id")?.value ??
      cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Total Active Clients
    const clientsRes = await client.query(`
      SELECT COUNT(*) as count FROM public.client 
      WHERE agent_id = $1 AND status = 'ACTIVE'
    `, [userId]);
    const activeClients = parseInt(clientsRes.rows[0].count);

    // 2. Pending Contracts (Polis Pending)
    const pendingContractsRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM public.contract con
      JOIN public.client c ON con.client_id = c.client_id
      WHERE c.agent_id = $1 AND con.status = 'PENDING'
    `, [userId]);

    const pendingContracts = parseInt(pendingContractsRes.rows[0].count);

    // 3. Points Balance (Komisi / Poin)
    const agentRes = await client.query(`
      SELECT points_balance FROM public.agent WHERE agent_id = $1
    `, [userId]);

    let points = 0;
    if (agentRes.rows.length > 0) {
      points = agentRes.rows[0].points_balance;
    }

    // 4. Total Claims (submitted/approved)
    const claimsRes = await client.query(`
        SELECT COUNT(*) as count FROM public.claim WHERE assigned_agent_id = $1
    `, [userId]);
    const totalClaims = parseInt(claimsRes.rows[0].count);

    return NextResponse.json({
      activeClients,
      pendingContracts,
      points,
      totalClaims
    });

  } catch (error) {
    console.error("Fetch metrics failed", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  } finally {
    client.release();
  }
}
