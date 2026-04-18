import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cached, CacheKeys, TTL } from "@/lib/cache";
import { logError } from "@/lib/logger";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    // Return empty requests instead of 401 to avoid breaking the notification UI
    return NextResponse.json({ requests: [] });
  }
  const userId = session.userId;

  try {
    const requests = await cached(
      CacheKeys.agentRequests(userId),
      TTL.SHORT,
      () => fetchRequests(userId),
    );
    return NextResponse.json({ requests });
  } catch (error) {
    logError("api.agent.requests.list", error, {
      userId,
      requestPath: "/api/agent/requests",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

async function fetchRequests(userId: string) {
  const client = await dbPool.connect();
  try {
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
      JOIN public.agent a ON r.agent_id = a.agent_id
      JOIN public.user_person_link upl ON a.person_id = upl.person_id
      WHERE upl.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);
    return result.rows;
  } finally {
    client.release();
  }
}
