import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import {
  listPendingInvitations,
  revokeInvitation,
} from "@/lib/agency-invitations";

/**
 * GET    → list pending invitations for the caller's agency
 * DELETE → revoke an invitation (?id=<uuid>)
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
  const invitations = await listPendingInvitations(session.agencyId);
  return NextResponse.json({ invitations });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await callerIsAdmin(session.userId, session.agencyId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id wajib" }, { status: 400 });
  }
  const ok = await revokeInvitation(id, session.agencyId, session.userId);
  if (!ok) {
    return NextResponse.json(
      { error: "Undangan tidak ditemukan atau sudah diproses" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
