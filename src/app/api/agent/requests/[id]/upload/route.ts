import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { saveDocument } from "@/lib/file-upload";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
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

    const filePath = await saveDocument(file, `req-${params.id}`);

    if (!filePath) {
      return NextResponse.json({ error: "File upload failed" }, { status: 500 });
    }

    await client.query(
      `UPDATE public.patient_data_request SET additional_data_file = $1, status = 'COMPLETED', updated_at = NOW() WHERE request_id = $2`,
      [filePath, params.id]
    );

    return NextResponse.json({ success: true, filePath });

  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  } finally {
    client.release();
  }
}
