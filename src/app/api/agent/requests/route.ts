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

    // Resolve Agent ID from User ID
    const agentLookup = await client.query(`
      SELECT a.agent_id 
      FROM public.agent a
      JOIN public.user_person_link upl ON a.person_id = upl.person_id
      WHERE upl.user_id = $1
    `, [userId]);

    if (agentLookup.rowCount === 0) {
      return NextResponse.json({ requests: [] });
    }

    const agentId = agentLookup.rows[0].agent_id;

    const result = await client.query(`
      SELECT 
        r.request_id,
        r.person_id,
        r.status,
        r.additional_data_request,
        r.additional_data_file,
        r.created_at,
        p.full_name as person_name,
        p.id_card as person_nik,
        h.email as hospital_email
      FROM public.patient_data_request r
      JOIN public.person p ON r.person_id = p.person_id
      JOIN public.app_user h ON r.hospital_id = h.user_id
      WHERE r.agent_id = $1
      ORDER BY r.created_at DESC
    `, [agentId]);

    return NextResponse.json({ requests: result.rows });

  } catch (error) {
    console.error("Fetch requests failed", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  } finally {
    client.release();
  }
}
