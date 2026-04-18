import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cached, CacheKeys, TTL } from "@/lib/cache";
import { logError } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const clients = await cached(CacheKeys.agentClients(userId), TTL.SHORT, () => fetchClients(userId));
    return NextResponse.json({ clients });
  } catch (error) {
    logError("api.agent.clients.list", error, {
      userId,
      requestPath: "/api/agent/clients",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

async function fetchClients(userId: string) {
  const client = await dbPool.connect();
  try {
    const result = await client.query(`
      SELECT
        c.client_id,
        p.full_name,
        p.phone_number,
        p.address,
        c.status,
        c.created_at,
        COUNT(con.contract_id) as contract_count,
        MAX(con.contract_product) as latest_product
      FROM public.client c
      JOIN public.person p ON c.person_id = p.person_id
      LEFT JOIN public.contract con ON con.client_id = c.client_id
      WHERE c.agent_id = $1
      GROUP BY c.client_id, p.full_name, p.phone_number, p.address, c.status, c.created_at
      ORDER BY c.created_at DESC
    `, [userId]);

    return result.rows;
  } finally {
    client.release();
  }
}
