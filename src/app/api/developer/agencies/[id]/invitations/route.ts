import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRoleFromCookies } from "@/lib/auth-cookies";
import { dbPool } from "@/lib/db";
import {
  AGENCY_ROLES,
  type AgencyRole,
} from "@/lib/agency-rbac";
import {
  buildInviteUrl,
  createInvitation,
  listPendingInvitations,
  revokeInvitation,
} from "@/lib/agency-invitations";

/**
 * Developer-scoped invitations: lets a developer / super_admin
 * bootstrap (or top-up) an agency by sending an invitation for ANY
 * agency, not just their own. Used by the "Buat Agency" → "Undang
 * Master Admin" two-step flow on /developer/agencies.
 *
 * GET    → list pending invitations for this agency
 * POST   → create an invitation (returns rawToken once + inviteUrl)
 * DELETE → revoke an invitation (?invitationId=...)
 */

const allowed = new Set(["developer", "super_admin"]);

async function gate(): Promise<{ devUserId: string } | NextResponse> {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { devUserId: session.userId };
}

async function agencyExists(agencyId: string): Promise<boolean> {
  const { rowCount } = await dbPool.query(
    `SELECT 1 FROM public.agency WHERE agency_id = $1 LIMIT 1`,
    [agencyId],
  );
  return (rowCount ?? 0) > 0;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  if (!(await agencyExists(id))) {
    return NextResponse.json({ error: "Agency tidak ditemukan" }, { status: 404 });
  }
  const invitations = await listPendingInvitations(id);
  return NextResponse.json({ invitations });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;
  if (!(await agencyExists(id))) {
    return NextResponse.json({ error: "Agency tidak ditemukan" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    agencyRole?: AgencyRole;
  } | null;

  const email = body?.email?.trim().toLowerCase();
  const agencyRole = (body?.agencyRole ?? "master_admin") as AgencyRole;

  if (!email) {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }
  if (!AGENCY_ROLES.includes(agencyRole)) {
    return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
  }

  try {
    const { invitation, rawToken } = await createInvitation({
      agencyId: id,
      email,
      fullName: body?.fullName ?? null,
      phoneNumber: body?.phoneNumber ?? null,
      agencyRole,
      invitedByUserId: guard.devUserId,
    });

    const origin = request.headers.get("origin") ?? request.nextUrl.origin;
    return NextResponse.json({
      invitationId: invitation.invitation_id,
      email: invitation.email,
      expiresAt: invitation.expires_at,
      inviteUrl: buildInviteUrl(origin, rawToken),
      rawToken,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal membuat undangan";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const invitationId = new URL(request.url).searchParams.get("invitationId");
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId wajib" }, { status: 400 });
  }

  const ok = await revokeInvitation(invitationId, id, guard.devUserId);
  if (!ok) {
    return NextResponse.json(
      { error: "Undangan tidak ditemukan atau sudah diproses" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true });
}
