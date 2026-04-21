import "server-only";
import type { PoolClient } from "pg";

/**
 * Agency-scoped roles (stored in agency_member.role).
 * Distinct from system-level roles (stored in app_user.role).
 */
export type AgencyRole = "master_admin" | "admin" | "manager" | "agent";

export const AGENCY_ROLES: AgencyRole[] = [
  "master_admin",
  "admin",
  "manager",
  "agent",
];

/**
 * Map an agency-scoped role to the system-level role that governs
 * middleware/portal routing. master_admin and admin become
 * admin_agency (so they land in /admin-agency/*); everybody else is
 * an agent.
 */
export function mapSystemRole(agencyRole: AgencyRole): "admin_agency" | "agent" {
  return agencyRole === "master_admin" || agencyRole === "admin"
    ? "admin_agency"
    : "agent";
}

/**
 * Write an append-only entry to agency_member_audit. Always call this
 * from inside the same transaction that mutated agency_member so the
 * audit row is guaranteed to exist iff the mutation committed.
 */
export async function writeAgencyMemberAudit(
  client: PoolClient,
  input: {
    agencyId: string;
    memberUserId: string;
    eventType:
      | "invited"
      | "accepted"
      | "added_directly"
      | "role_changed"
      | "status_changed"
      | "removed";
    fromRole?: string | null;
    toRole?: string | null;
    fromStatus?: string | null;
    toStatus?: string | null;
    byUserId?: string | null;
    reason?: string | null;
  },
) {
  await client.query(
    `INSERT INTO public.agency_member_audit (
       agency_id, member_user_id, event_type,
       from_role, to_role, from_status, to_status,
       by_user_id, reason
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.agencyId,
      input.memberUserId,
      input.eventType,
      input.fromRole ?? null,
      input.toRole ?? null,
      input.fromStatus ?? null,
      input.toStatus ?? null,
      input.byUserId ?? null,
      input.reason ?? null,
    ],
  );
}

/**
 * Idempotent upsert of an agency membership. Keeps three things in
 * sync in a single transaction:
 *   1. `agency_member` row (insert or promote/demote)
 *   2. `app_user.role` (system-level) and `app_user.agency_id`
 *   3. Audit trail entry
 *
 * If the user was already a member of a DIFFERENT agency, that old
 * membership is marked INACTIVE. Single-agency-per-user is an
 * intentional constraint for now.
 */
export async function syncAgencyMembership(
  client: PoolClient,
  input: {
    userId: string;
    agencyId: string;
    agencyRole: AgencyRole;
    byUserId: string | null;
    /** What to record in audit. Defaults to "added_directly". */
    auditEvent?: "added_directly" | "accepted" | "role_changed";
  },
): Promise<{ created: boolean; previousRole: string | null }> {
  const systemRole = mapSystemRole(input.agencyRole);

  // 1. Deactivate membership in any OTHER agency
  await client.query(
    `UPDATE public.agency_member
       SET status = 'INACTIVE'
     WHERE user_id = $1 AND agency_id <> $2 AND status = 'ACTIVE'`,
    [input.userId, input.agencyId],
  );

  // 2. Sync app_user
  await client.query(
    `UPDATE public.app_user
       SET agency_id = $2,
           role = $3
     WHERE user_id = $1`,
    [input.userId, input.agencyId, systemRole],
  );

  // 3. Upsert agency_member
  const existing = await client.query<{ role: string; status: string }>(
    `SELECT role, status FROM public.agency_member
     WHERE user_id = $1 AND agency_id = $2
     LIMIT 1`,
    [input.userId, input.agencyId],
  );

  if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO public.agency_member (
         agency_id, user_id, role, invited_by, status
       ) VALUES ($1, $2, $3, $4, 'ACTIVE')`,
      [input.agencyId, input.userId, input.agencyRole, input.byUserId],
    );
    await writeAgencyMemberAudit(client, {
      agencyId: input.agencyId,
      memberUserId: input.userId,
      eventType: input.auditEvent ?? "added_directly",
      toRole: input.agencyRole,
      toStatus: "ACTIVE",
      byUserId: input.byUserId,
    });
    return { created: true, previousRole: null };
  }

  const prev = existing.rows[0];
  if (prev.role === input.agencyRole && prev.status === "ACTIVE") {
    // no-op
    return { created: false, previousRole: prev.role };
  }

  await client.query(
    `UPDATE public.agency_member
       SET role = $3, status = 'ACTIVE'
     WHERE user_id = $1 AND agency_id = $2`,
    [input.userId, input.agencyId, input.agencyRole],
  );

  await writeAgencyMemberAudit(client, {
    agencyId: input.agencyId,
    memberUserId: input.userId,
    eventType:
      input.auditEvent ??
      (prev.role !== input.agencyRole ? "role_changed" : "status_changed"),
    fromRole: prev.role,
    toRole: input.agencyRole,
    fromStatus: prev.status,
    toStatus: "ACTIVE",
    byUserId: input.byUserId,
  });

  return { created: false, previousRole: prev.role };
}
