import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

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

    // Verify ownership
    const check = await client.query(
        `SELECT request_id FROM public.patient_data_request WHERE request_id = $1 AND agent_id = $2`,
        [params.id, userId]
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
