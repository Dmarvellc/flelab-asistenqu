import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import {
  acceptJoinRequest,
  listPendingJoinRequests,
  rejectJoinRequest,
} from "@/lib/agency-join-requests";

/**
 * Admin endpoints for agency join-requests.
 *   GET   → list pending requests for caller's agency
 *   PATCH → accept/reject a request: { requestId, action: 'accept'|'reject', note? }
 *
 * Only master_admin / admin may call these.
 */

async function callerIsAdmin(userId: string, agencyId: string) {
  const { rows } = await dbPool.query<{ role: string }>(
    `SELECT role FROM public.agency_member
      WHERE user_id = $1 AND agency_id = $2 AND status = 'ACTIVE' LIMIT 1`,
    [userId, agencyId],
  );
  return rows[0] && ["master_admin", "admin"].includes(rows[0].role);
}

export async function GET() {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await callerIsAdmin(session.userId, session.agencyId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const requests = await listPendingJoinRequests(session.agencyId);
  return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await callerIsAdmin(session.userId, session.agencyId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    requestId?: string;
    action?: "accept" | "reject";
    note?: string;
  };
  if (!body.requestId || !body.action) {
    return NextResponse.json(
      { error: "requestId dan action wajib" },
      { status: 400 },
    );
  }

  try {
    if (body.action === "accept") {
      const result = await acceptJoinRequest({
        requestId: body.requestId,
        agencyId: session.agencyId,
        byUserId: session.userId,
        note: body.note ?? null,
      });
      return NextResponse.json({ success: true, ...result });
    }
    const ok = await rejectJoinRequest({
      requestId: body.requestId,
      agencyId: session.agencyId,
      byUserId: session.userId,
      note: body.note ?? null,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan atau sudah diproses" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses permintaan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
