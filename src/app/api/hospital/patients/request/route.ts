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

    const result = await client.query(`
      SELECT 
        r.request_id,
        r.person_id,
        r.status,
        r.additional_data_request,
        r.additional_data_file,
        r.created_at,
        p.full_name as person_name,
        p.id_card as person_nik
      FROM public.patient_data_request r
      JOIN public.person p ON r.person_id = p.person_id
      WHERE r.hospital_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    return NextResponse.json({ requests: result.rows });

  } catch (error) {
    console.error("Fetch requests failed", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { person_id, additional_data_request } = await req.json();

    if (!person_id) {
      return NextResponse.json({ error: "Person ID is required" }, { status: 400 });
    }

    // Find Agent associated with Person
    const agentResult = await client.query(
      `SELECT agent_id FROM public.client WHERE person_id = $1 LIMIT 1`,
      [person_id]
    );

    if (agentResult.rowCount === 0) {
      return NextResponse.json({ error: "Patient not found or not associated with an agent" }, { status: 404 });
    }

    const agent_id = agentResult.rows[0].agent_id;

    const result = await client.query(
      `INSERT INTO public.patient_data_request (hospital_id, agent_id, person_id, additional_data_request) 
         VALUES ($1, $2, $3, $4) 
         RETURNING request_id`,
      [userId, agent_id, person_id, additional_data_request || '']
    );

    return NextResponse.json({ success: true, request_id: result.rows[0].request_id });

  } catch (error) {
    console.error("Create request failed", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  } finally {
    client.release();
  }
}
