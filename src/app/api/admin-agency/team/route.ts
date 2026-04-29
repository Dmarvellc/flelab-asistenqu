import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import {
  AGENCY_ROLES,
  type AgencyRole,
  syncAgencyMembership,
  writeAgencyMemberAudit,
} from "@/lib/agency-rbac";
import {
  buildInviteUrl,
  createInvitation,
} from "@/lib/agency-invitations";

/**
 * Team management for agency admins.
 *
 *   GET    → list agency members
 *   POST   → add a member. Two paths:
 *              (a) email belongs to an existing app_user → attach directly
 *              (b) email is new → create an invitation (raw token returned once)
 *   PATCH  → promote / demote / suspend
 *   DELETE → remove
 *
 * All mutations go through lib/agency-rbac.syncAgencyMembership, which
 * keeps app_user.role, agency_member, and agency_member_audit in sync
 * in a single transaction.
 */

async function getCallerAgencyRole(userId: string, agencyId: string) {
  const { rows } = await dbPool.query<{ role: AgencyRole }>(
    `SELECT role FROM public.agency_member
      WHERE user_id = $1 AND agency_id = $2 AND status = 'ACTIVE'
      LIMIT 1`,
    [userId, agencyId],
  );
  return rows[0]?.role ?? null;
}

function canAdminister(callerRole: AgencyRole | null): boolean {
  return callerRole === "master_admin" || callerRole === "admin";
}

// ───────────────────────────────────────────────────────────── GET
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await dbPool.query(
      `SELECT
         m.member_id, m.role AS member_role, m.permissions, m.status AS member_status,
         m.joined_at, m.created_at,
         u.user_id, u.email, u.role AS system_role, u.status AS user_status,
         p.full_name, p.phone_number
       FROM public.agency_member m
       JOIN public.app_user u ON u.user_id = m.user_id
       LEFT JOIN public.user_person_link l ON l.user_id = u.user_id
       LEFT JOIN public.person p ON p.person_id = l.person_id
       WHERE m.agency_id = $1
       ORDER BY
         CASE m.role
           WHEN 'master_admin' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'manager' THEN 3
           WHEN 'agent' THEN 4
           ELSE 5
         END,
         m.joined_at ASC`,
      [session.agencyId],
    );

    return NextResponse.json({ members: result.rows });
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}

// ───────────────────────────────────────────────────────────── POST
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = await getCallerAgencyRole(session.userId, session.agencyId);
    if (!canAdminister(callerRole)) {
      return NextResponse.json(
        { error: "Hanya master admin / admin yang boleh menambah anggota" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      phone?: string;
      role?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const role = (body.role ?? "agent") as AgencyRole;

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
    }
    if (!AGENCY_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }
    if (role === "master_admin" && callerRole !== "master_admin") {
      return NextResponse.json(
        { error: "Hanya master admin yang boleh membuat master admin baru" },
        { status: 403 },
      );
    }

    // Enforce uniqueness: each agency may only have ONE master_admin at a time.
    if (role === "master_admin") {
      const { rows: existingMasters } = await dbPool.query(
        `SELECT 1 FROM public.agency_member
          WHERE agency_id = $1 AND role = 'master_admin' AND status = 'ACTIVE'
          LIMIT 1`,
        [session.agencyId],
      );
      if (existingMasters.length > 0) {
        return NextResponse.json(
          { error: "Agensi ini sudah memiliki Master Admin. Lepas atau ubah peran Master Admin saat ini sebelum menetapkan yang baru." },
          { status: 409 },
        );
      }
      // Also block if there is still a pending invitation for master_admin
      const { rows: pendingMasterInvite } = await dbPool.query(
        `SELECT 1 FROM public.agency_invitation
          WHERE agency_id = $1
            AND agency_role = 'master_admin'
            AND accepted_at IS NULL
            AND revoked_at IS NULL
            AND expires_at > now()
          LIMIT 1`,
        [session.agencyId],
      );
      if (pendingMasterInvite.length > 0) {
        return NextResponse.json(
          { error: "Sudah ada undangan Master Admin yang masih aktif untuk agensi ini." },
          { status: 409 },
        );
      }
    }

    // Does this user already exist on the platform?
    const existing = await dbPool.query<{ user_id: string }>(
      `SELECT user_id FROM public.app_user WHERE lower(email) = $1`,
      [email],
    );

    if (existing.rows.length > 0) {
      // Direct attach (no invite needed) — user is already on the platform
      const userId = existing.rows[0].user_id;

      // Reject if already active in THIS agency
      const already = await dbPool.query(
        `SELECT 1 FROM public.agency_member
          WHERE user_id = $1 AND agency_id = $2 AND status = 'ACTIVE' LIMIT 1`,
        [userId, session.agencyId],
      );
      if ((already.rowCount ?? 0) > 0) {
        return NextResponse.json(
          { error: "User sudah menjadi anggota aktif agency ini" },
          { status: 409 },
        );
      }

      const client = await dbPool.connect();
      try {
        await client.query("BEGIN");
        await syncAgencyMembership(client, {
          userId,
          agencyId: session.agencyId,
          agencyRole: role,
          byUserId: session.userId,
          auditEvent: "added_directly",
        });
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        client.release();
      }

      return NextResponse.json({ mode: "attached", userId });
    }

    // New user → generate an invitation
    const { invitation, rawToken } = await createInvitation({
      agencyId: session.agencyId,
      email,
      fullName: body.fullName ?? null,
      phoneNumber: body.phone ?? null,
      agencyRole: role,
      invitedByUserId: session.userId,
    });

    // Audit "invited" event — synthetic user_id using the invitation id
    // (we don't have a real user_id yet; this row gets replaced by an
    // "accepted" row once they click through)
    await dbPool.query(
      `INSERT INTO public.agency_member_audit (
         agency_id, member_user_id, event_type, to_role, by_user_id, reason
       ) VALUES ($1, $2, 'invited', $3, $4, $5)`,
      [
        session.agencyId,
        session.userId, // placeholder — the inviter, since the invitee has no user yet
        role,
        session.userId,
        `invited ${email}`,
      ],
    ).catch(() => {
      // Best-effort — don't fail the invite if audit insert fails
    });

    const origin = request.headers.get("origin") ?? request.nextUrl.origin;
    return NextResponse.json({
      mode: "invited",
      invitationId: invitation.invitation_id,
      email: invitation.email,
      expiresAt: invitation.expires_at,
      inviteUrl: buildInviteUrl(origin, rawToken),
      /** Raw token — shown ONCE, never retrievable again */
      rawToken,
    });
  } catch (error) {
    console.error("Failed to add team member:", error);
    const msg = error instanceof Error ? error.message : "Gagal menambah anggota";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ───────────────────────────────────────────────────────────── PATCH
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = await getCallerAgencyRole(session.userId, session.agencyId);
    if (!canAdminister(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      memberId?: string;
      role?: AgencyRole;
      status?: string;
      permissions?: unknown;
      reason?: string;
    };
    if (!body.memberId) {
      return NextResponse.json({ error: "memberId wajib" }, { status: 400 });
    }

    const { rows } = await dbPool.query<{
      user_id: string;
      role: AgencyRole;
      status: string;
    }>(
      `SELECT user_id, role, status FROM public.agency_member
        WHERE member_id = $1 AND agency_id = $2`,
      [body.memberId, session.agencyId],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }
    const target = rows[0];

    if (target.role === "master_admin" && callerRole !== "master_admin") {
      return NextResponse.json(
        { error: "Tidak boleh memodifikasi master admin" },
        { status: 403 },
      );
    }
    if (
      target.user_id === session.userId &&
      body.role &&
      body.role !== "master_admin" &&
      target.role === "master_admin"
    ) {
      return NextResponse.json(
        { error: "Tidak bisa menurunkan status diri sendiri dari master admin" },
        { status: 403 },
      );
    }

    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");

      if (body.role && body.role !== target.role) {
        if (!AGENCY_ROLES.includes(body.role)) {
          throw new Error("Role tidak valid");
        }
        if (body.role === "master_admin" && callerRole !== "master_admin") {
          throw new Error("Hanya master admin yang boleh promote ke master admin");
        }
        await syncAgencyMembership(client, {
          userId: target.user_id,
          agencyId: session.agencyId,
          agencyRole: body.role,
          byUserId: session.userId,
          auditEvent: "role_changed",
        });
      }

      if (body.status && body.status !== target.status) {
        await client.query(
          `UPDATE public.agency_member
             SET status = $3
           WHERE member_id = $1 AND agency_id = $2`,
          [body.memberId, session.agencyId, body.status],
        );
        await writeAgencyMemberAudit(client, {
          agencyId: session.agencyId,
          memberUserId: target.user_id,
          eventType: "status_changed",
          fromStatus: target.status,
          toStatus: body.status,
          byUserId: session.userId,
          reason: body.reason ?? null,
        });
      }

      if (body.permissions !== undefined) {
        await client.query(
          `UPDATE public.agency_member
             SET permissions = $3
           WHERE member_id = $1 AND agency_id = $2`,
          [body.memberId, session.agencyId, JSON.stringify(body.permissions)],
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      const msg = e instanceof Error ? e.message : "Gagal memperbarui anggota";
      return NextResponse.json({ error: msg }, { status: 400 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// ───────────────────────────────────────────────────────────── DELETE
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = await getCallerAgencyRole(session.userId, session.agencyId);
    if (!canAdminister(callerRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    const reason = searchParams.get("reason") ?? null;
    if (!memberId) {
      return NextResponse.json({ error: "memberId wajib" }, { status: 400 });
    }

    const { rows } = await dbPool.query<{
      user_id: string;
      role: AgencyRole;
      status: string;
    }>(
      `SELECT user_id, role, status FROM public.agency_member
        WHERE member_id = $1 AND agency_id = $2`,
      [memberId, session.agencyId],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }
    const target = rows[0];
    if (target.role === "master_admin") {
      return NextResponse.json(
        { error: "Master admin tidak bisa dihapus" },
        { status: 403 },
      );
    }
    if (target.user_id === session.userId) {
      return NextResponse.json(
        { error: "Tidak bisa menghapus diri sendiri" },
        { status: 403 },
      );
    }

    const client = await dbPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM public.agency_member
          WHERE member_id = $1 AND agency_id = $2`,
        [memberId, session.agencyId],
      );
      // Also detach from app_user so they don't keep agency portal access
      await client.query(
        `UPDATE public.app_user
            SET agency_id = NULL
          WHERE user_id = $1 AND agency_id = $2`,
        [target.user_id, session.agencyId],
      );
      await writeAgencyMemberAudit(client, {
        agencyId: session.agencyId,
        memberUserId: target.user_id,
        eventType: "removed",
        fromRole: target.role,
        fromStatus: target.status,
        byUserId: session.userId,
        reason,
      });
      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
