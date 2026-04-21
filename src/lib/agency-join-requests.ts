import "server-only";
import type { PoolClient } from "pg";
import { dbPool } from "@/lib/db";
import { syncAgencyMembership } from "@/lib/agency-rbac";

/**
 * Join-request flow — the inverse of invitations.
 *
 *   1. Agent self-registers and optionally picks an agency.
 *      createJoinRequest(...) writes a pending row; the agent stays
 *      app_user.status='PENDING' until an admin responds.
 *   2. Agency admin lists + accepts/rejects at /admin-agency/team.
 *   3. acceptJoinRequest runs syncAgencyMembership and flips the user
 *      to ACTIVE in a single transaction.
 */

export interface JoinRequestRow {
  request_id: string;
  agency_id: string;
  requester_user_id: string;
  message: string | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  responded_at: string | null;
  responded_by: string | null;
  response_note: string | null;
  created_at: string;
}

export interface JoinRequestListRow extends JoinRequestRow {
  email: string;
  full_name: string | null;
  phone_number: string | null;
}

/** Create a pending join-request. Safe to call from the register flow. */
export async function createJoinRequest(
  client: PoolClient,
  input: { agencyId: string; requesterUserId: string; message?: string | null },
): Promise<JoinRequestRow> {
  // Resolve a stale previous request for the same (agency, user) so the
  // unique partial index doesn't block us.
  await client.query(
    `UPDATE public.agency_join_request
        SET status = 'withdrawn', responded_at = NOW()
      WHERE agency_id = $1 AND requester_user_id = $2 AND status = 'pending'`,
    [input.agencyId, input.requesterUserId],
  );

  const { rows } = await client.query<JoinRequestRow>(
    `INSERT INTO public.agency_join_request (agency_id, requester_user_id, message)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.agencyId, input.requesterUserId, input.message ?? null],
  );
  return rows[0];
}

/** List pending requests for an agency (for the admin UI). */
export async function listPendingJoinRequests(agencyId: string) {
  const { rows } = await dbPool.query<JoinRequestListRow>(
    `SELECT r.*, u.email, p.full_name, p.phone_number
       FROM public.agency_join_request r
       JOIN public.app_user u ON u.user_id = r.requester_user_id
       LEFT JOIN public.user_person_link l ON l.user_id = u.user_id
       LEFT JOIN public.person p ON p.person_id = l.person_id
      WHERE r.agency_id = $1 AND r.status = 'pending'
      ORDER BY r.created_at ASC`,
    [agencyId],
  );
  return rows;
}

/**
 * Accept a join request: sync membership + set user ACTIVE + mark
 * request accepted. All in one transaction.
 */
export async function acceptJoinRequest(input: {
  requestId: string;
  agencyId: string;
  byUserId: string;
  note?: string | null;
}): Promise<{ userId: string }> {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<JoinRequestRow>(
      `SELECT * FROM public.agency_join_request
        WHERE request_id = $1 AND agency_id = $2
        FOR UPDATE`,
      [input.requestId, input.agencyId],
    );
    if (rows.length === 0) throw new Error("Permintaan tidak ditemukan");
    const req = rows[0];
    if (req.status !== "pending") {
      throw new Error("Permintaan sudah diproses sebelumnya");
    }

    // Attach as agent by default; admin can promote later via PATCH
    await syncAgencyMembership(client, {
      userId: req.requester_user_id,
      agencyId: input.agencyId,
      agencyRole: "agent",
      byUserId: input.byUserId,
      auditEvent: "accepted",
    });

    // Flip user to ACTIVE (they were left PENDING at register time)
    await client.query(
      `UPDATE public.app_user
          SET status = 'ACTIVE',
              approved_at = NOW(),
              approved_by = $2
        WHERE user_id = $1 AND status = 'PENDING'`,
      [req.requester_user_id, input.byUserId],
    );

    await client.query(
      `UPDATE public.agency_join_request
          SET status = 'accepted',
              responded_at = NOW(),
              responded_by = $2,
              response_note = $3
        WHERE request_id = $1`,
      [input.requestId, input.byUserId, input.note ?? null],
    );

    await client.query("COMMIT");
    return { userId: req.requester_user_id };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Reject a pending request. User remains PENDING and can apply elsewhere. */
export async function rejectJoinRequest(input: {
  requestId: string;
  agencyId: string;
  byUserId: string;
  note?: string | null;
}): Promise<boolean> {
  const { rowCount } = await dbPool.query(
    `UPDATE public.agency_join_request
        SET status = 'rejected',
            responded_at = NOW(),
            responded_by = $3,
            response_note = $4
      WHERE request_id = $1 AND agency_id = $2 AND status = 'pending'`,
    [input.requestId, input.agencyId, input.byUserId, input.note ?? null],
  );
  return (rowCount ?? 0) > 0;
}
