import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const client = await dbPool.connect();
  
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch clients for this agent (assuming agent_id = user_id for now)
    const result = await client.query(`
      SELECT 
        c.client_id,
        p.full_name,
        p.phone_number,
        p.address,
        c.status,
        c.created_at,
        (
            SELECT COUNT(*) FROM public.contract con WHERE con.client_id = c.client_id
        ) as contract_count,
        (
            SELECT con.contract_product FROM public.contract con WHERE con.client_id = c.client_id LIMIT 1
        ) as latest_product
      FROM public.client c
      JOIN public.person p ON c.person_id = p.person_id
      WHERE c.agent_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    return NextResponse.json({ clients: result.rows });

  } catch (error) {
    console.error("Fetch clients failed", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  } finally {
    client.release();
  }
}
