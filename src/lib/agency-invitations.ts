import "server-only";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbPool } from "@/lib/db";
import {
  AGENCY_ROLES,
  type AgencyRole,
  syncAgencyMembership,
  writeAgencyMemberAudit,
} from "@/lib/agency-rbac";

/**
 * Invitation-token flow for onboarding new agents/admins into an agency.
 *
 *   1. Agency admin calls createInvitation(...) — returns RAW token ONCE.
 *   2. Admin sends the invite link (contains raw token) via WhatsApp/email.
 *   3. Prospective member opens the link → getInvitationByToken for preview.
 *   4. They submit password → acceptInvitation creates app_user + membership
 *      in a single transaction and marks the invitation accepted.
 *
 * The DB only stores sha256(token) so a DB leak can't be used to hijack
 * pending invites.
 */

const TOKEN_BYTES = 24; // 192 bits → 32-char base64url
const DEFAULT_TTL_DAYS = 7;

export interface InvitationRow {
  invitation_id: string;
  agency_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  agency_role: AgencyRole;
  invited_by_user_id: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface InvitationPreview {
  invitation_id: string;
  email: string;
  full_name: string | null;
  agency_role: AgencyRole;
  agency_name: string;
  agency_slug: string | null;
  invited_by_email: string | null;
  expires_at: string;
  status: "pending" | "accepted" | "revoked" | "expired";
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function buildInviteUrl(origin: string, rawToken: string): string {
  return `${origin.replace(/\/$/, "")}/invitations/${rawToken}`;
}

/**
 * Create a fresh invitation. Raw token is returned ONCE — the caller is
 * responsible for delivering it to the invitee; it is not recoverable
 * from the DB afterwards.
 */
export async function createInvitation(input: {
  agencyId: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  agencyRole: AgencyRole;
  invitedByUserId: string;
  ttlDays?: number;
}): Promise<{ invitation: InvitationRow; rawToken: string }> {
  if (!AGENCY_ROLES.includes(input.agencyRole)) {
    throw new Error(`Invalid agency role: ${input.agencyRole}`);
  }
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const ttl = input.ttlDays ?? DEFAULT_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    // Revoke any existing active invite for the same email+agency so we
    // don't trip the unique index.
    await client.query(
      `UPDATE public.agency_invitation
         SET revoked_at = NOW(), revoked_by_user_id = $3
       WHERE agency_id = $1
         AND lower(email) = lower($2)
         AND accepted_at IS NULL
         AND revoked_at IS NULL`,
      [input.agencyId, email, input.invitedByUserId],
    );

    const { rows } = await client.query<InvitationRow>(
      `INSERT INTO public.agency_invitation (
         agency_id, email, full_name, phone_number, agency_role,
         token_hash, invited_by_user_id, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.agencyId,
        email,
        input.fullName?.trim() || null,
        input.phoneNumber?.trim() || null,
        input.agencyRole,
        tokenHash,
        input.invitedByUserId,
        expiresAt.toISOString(),
      ],
    );

    await client.query("COMMIT");
    return { invitation: rows[0], rawToken };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Preview an invitation by raw token. Safe to call without auth — used
 * by the public /invitations/[token] landing page. Returns null if the
 * token doesn't match anything, is revoked, or expired.
 */
export async function getInvitationByToken(
  rawToken: string,
): Promise<InvitationPreview | null> {
  const tokenHash = hashToken(rawToken);
  const { rows } = await dbPool.query<
    InvitationRow & { agency_name: string; agency_slug: string | null; invited_by_email: string | null }
  >(
    `SELECT i.*,
            a.name AS agency_name,
            a.slug AS agency_slug,
            u.email AS invited_by_email
       FROM public.agency_invitation i
       JOIN public.agency a ON a.agency_id = i.agency_id
       LEFT JOIN public.app_user u ON u.user_id = i.invited_by_user_id
      WHERE i.token_hash = $1
      LIMIT 1`,
    [tokenHash],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  let status: InvitationPreview["status"] = "pending";
  if (r.revoked_at) status = "revoked";
  else if (r.accepted_at) status = "accepted";
  else if (new Date(r.expires_at) < new Date()) status = "expired";
  return {
    invitation_id: r.invitation_id,
    email: r.email,
    full_name: r.full_name,
    agency_role: r.agency_role,
    agency_name: r.agency_name,
    agency_slug: r.agency_slug,
    invited_by_email: r.invited_by_email,
    expires_at: r.expires_at,
    status,
  };
}

/**
 * Accept an invitation by raw token. Creates the app_user (+ person
 * record if fullName provided) and the agency membership, atomically.
 *
 * If an app_user with the same email already exists, we re-use it and
 * just attach them to the agency — this is how the "I was already on
 * the platform, now my agency invited me" case is handled.
 */
export async function acceptInvitation(input: {
  rawToken: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
}): Promise<{ userId: string; agencyId: string }> {
  const tokenHash = hashToken(input.rawToken);
  if (!input.password || input.password.length < 8) {
    throw new Error("Password minimum 8 karakter");
  }

  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    const invRes = await client.query<InvitationRow>(
      `SELECT * FROM public.agency_invitation
        WHERE token_hash = $1
        FOR UPDATE`,
      [tokenHash],
    );
    if (invRes.rows.length === 0) {
      throw new Error("Undangan tidak ditemukan");
    }
    const inv = invRes.rows[0];
    if (inv.revoked_at) throw new Error("Undangan sudah dicabut");
    if (inv.accepted_at) throw new Error("Undangan sudah digunakan");
    if (new Date(inv.expires_at) < new Date()) {
      throw new Error("Undangan sudah kedaluwarsa");
    }

    // Find or create app_user
    let userId: string;
    const existing = await client.query<{ user_id: string }>(
      `SELECT user_id FROM public.app_user WHERE lower(email) = lower($1)`,
      [inv.email],
    );

    const passwordHash = await bcrypt.hash(input.password, 10);

    if (existing.rows.length > 0) {
      userId = existing.rows[0].user_id;
      // Existing users: update password (the invite is authoritative)
      await client.query(
        `UPDATE public.app_user
           SET password_hash = $2,
               status = 'ACTIVE'
         WHERE user_id = $1`,
        [userId, passwordHash],
      );
    } else {
      const idRes = await client.query<{ id: string }>(
        `SELECT gen_random_uuid() AS id`,
      );
      userId = idRes.rows[0].id;

      // mapSystemRole is applied inside syncAgencyMembership, but we
      // need SOMETHING for the initial INSERT — use "agent" as a safe
      // placeholder; syncAgencyMembership overwrites it immediately.
      await client.query(
        `INSERT INTO public.app_user (user_id, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'agent', 'ACTIVE')`,
        [userId, inv.email, passwordHash],
      );

      // Create person row if we have name info
      const fullName = input.fullName?.trim() || inv.full_name || null;
      if (fullName) {
        const personRes = await client.query<{ person_id: string }>(
          `INSERT INTO public.person (full_name, phone_number)
           VALUES ($1, $2) RETURNING person_id`,
          [fullName, input.phoneNumber?.trim() || inv.phone_number || null],
        );
        await client.query(
          `INSERT INTO public.user_person_link (user_id, person_id, relation_type)
           VALUES ($1, $2, 'OWNER')`,
          [userId, personRes.rows[0].person_id],
        );
      }
    }

    // Attach to agency (syncs app_user.role + agency_member + audit)
    await syncAgencyMembership(client, {
      userId,
      agencyId: inv.agency_id,
      agencyRole: inv.agency_role,
      byUserId: inv.invited_by_user_id,
      auditEvent: "accepted",
    });

    // Mark invite as used
    await client.query(
      `UPDATE public.agency_invitation
         SET accepted_at = NOW(), accepted_user_id = $2
       WHERE invitation_id = $1`,
      [inv.invitation_id, userId],
    );

    await client.query("COMMIT");
    return { userId, agencyId: inv.agency_id };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** List pending invitations for an agency (for the admin UI). */
export async function listPendingInvitations(agencyId: string) {
  const { rows } = await dbPool.query<
    InvitationRow & { invited_by_email: string | null }
  >(
    `SELECT i.*, u.email AS invited_by_email
       FROM public.agency_invitation i
       LEFT JOIN public.app_user u ON u.user_id = i.invited_by_user_id
      WHERE i.agency_id = $1
        AND i.accepted_at IS NULL
        AND i.revoked_at IS NULL
        AND i.expires_at > NOW()
      ORDER BY i.created_at DESC`,
    [agencyId],
  );
  return rows;
}

export async function revokeInvitation(
  invitationId: string,
  agencyId: string,
  byUserId: string,
) {
  const { rowCount } = await dbPool.query(
    `UPDATE public.agency_invitation
        SET revoked_at = NOW(), revoked_by_user_id = $3
      WHERE invitation_id = $1
        AND agency_id = $2
        AND accepted_at IS NULL
        AND revoked_at IS NULL`,
    [invitationId, agencyId, byUserId],
  );
  return (rowCount ?? 0) > 0;
}

// Re-export so API routes don't need two imports
export { writeAgencyMemberAudit, syncAgencyMembership };
