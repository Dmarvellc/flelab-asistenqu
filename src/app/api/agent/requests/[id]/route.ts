import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
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
        p.birth_date,
        p.gender,
        p.address,
        h.email as hospital_email
      FROM public.patient_data_request r
      JOIN public.person p ON r.person_id = p.person_id
      JOIN public.app_user h ON r.hospital_id = h.user_id
      WHERE r.request_id = $1 AND r.agent_id = $2
    `, [params.id, agentId]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: result.rows[0] });

  } catch (error) {
    console.error("Fetch request details failed", error);
    return NextResponse.json({ error: "Failed to fetch request details" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await req.json();

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Resolve Agent ID from User ID
    const agentLookup = await client.query(`
      SELECT a.agent_id 
      FROM public.agent a
      JOIN public.user_person_link upl ON a.person_id = upl.person_id
      WHERE upl.user_id = $1
    `, [userId]);

    if (agentLookup.rowCount === 0) {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    const agentId = agentLookup.rows[0].agent_id;

    // Verify ownership
    const check = await client.query(
      `SELECT request_id FROM public.patient_data_request WHERE request_id = $1 AND agent_id = $2`,
      [params.id, agentId]
    );

    if (check.rowCount === 0) {
      return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
    }

    await client.query(
      `UPDATE public.patient_data_request SET status = $1, updated_at = NOW() WHERE request_id = $2`,
      [status, params.id]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update request failed", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    const agentId = agentLookup.rows[0].agent_id;

    // Verify ownership
    const check = await client.query(
      `SELECT request_id FROM public.patient_data_request WHERE request_id = $1 AND agent_id = $2`,
      [params.id, agentId]
    );

    if (check.rowCount === 0) {
      return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
    }

    await client.query(
      `DELETE FROM public.patient_data_request WHERE request_id = $1`,
      [params.id]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete request failed", error);
    return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
  } finally {
    client.release();
  }
}
