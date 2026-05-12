import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireRole, revokeSession, revokeUserSessions, invalidateUserSessionsCache } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { roles } from "@/lib/rbac";

const ALLOWED_USER_MANAGEMENT_ROLES = ["developer", "super_admin"] as const;
const USER_STATUSES = ["ACTIVE", "PENDING", "REJECTED", "SUSPENDED"] as const;
const userIdSchema = z.string().uuid();

const patchUserSchema = z
  .object({
    role: z.enum(roles).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one field must be updated",
  });

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  console.error("User management route failed", error);
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole([...ALLOWED_USER_MANAGEMENT_ROLES]);
    const params = await props.params;
    const userId = userIdSchema.parse(params.id);

    const result = await dbPool.query(
      `SELECT
         u.user_id,
         u.email,
         u.role,
         u.status,
         u.created_at,
         u.approved_at,
         u.approved_by,
         u.agency_id
       FROM public.app_user u
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([...ALLOWED_USER_MANAGEMENT_ROLES]);
    const params = await props.params;
    const userId = userIdSchema.parse(params.id);
    const body = patchUserSchema.parse(await request.json());

    const client = await dbPool.connect();
    let shouldRevokeSessions = false;

    try {
      await client.query("BEGIN");

      const existingUserRes = await client.query<{
        user_id: string;
        role: string;
        status: string;
      }>(
        `SELECT user_id, role, status
         FROM public.app_user
         WHERE user_id = $1
         FOR UPDATE`,
        [userId]
      );

      if (existingUserRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const existingUser = existingUserRes.rows[0];
      const nextRole = body.role ?? existingUser.role;
      const nextStatus = body.status ?? existingUser.status;
      
      // If we are suspending, we don't want to revoke sessions immediately because 
      // we want the AuthWatcher to see the SUSPENDED status and redirect to /suspended.
      // But we still need to clear the session cache to force a DB check.
      shouldRevokeSessions =
        existingUser.role !== nextRole || (existingUser.status !== nextStatus && nextStatus !== 'SUSPENDED');
      
      const shouldClearCacheForSuspend = (existingUser.status !== nextStatus && nextStatus === 'SUSPENDED');

      const updateRes = await client.query(
        `UPDATE public.app_user
         SET role = $1,
             status = $2
         WHERE user_id = $3
         RETURNING user_id, email, role, status, created_at, approved_at, approved_by, agency_id`,
        [nextRole, nextStatus, userId]
      );

      if (body.status !== undefined) {
        await client.query(
          `UPDATE public.agent
           SET status = $1
           WHERE agent_id = $2`,
          [body.status, userId]
        );
      }

      await client.query("COMMIT");

      if (shouldRevokeSessions) {
        if (userId === session.userId) {
          const sessionIdsRes = await dbPool.query<{ session_id: string }>(
            `SELECT session_id
             FROM public.auth_session
             WHERE user_id = $1
               AND revoked = FALSE`,
            [userId]
          );
          await Promise.all(sessionIdsRes.rows.map((row) => revokeSession(row.session_id)));
        } else {
          await revokeUserSessions(userId);
        }
      } else if (shouldClearCacheForSuspend) {
        // Just clear cache so next request hits DB and sees the new SUSPENDED status
        await client.query(
          `UPDATE public.auth_session SET user_status = 'SUSPENDED' WHERE user_id = $1`,
          [userId]
        );
        await invalidateUserSessionsCache(userId);
      }

      return NextResponse.json(updateRes.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/users/[id]
 *
 * Strategy:
 *   1. Try a hard DELETE (works after migration v9 — most FK columns are now
 *      SET NULL or CASCADE).
 *   2. If a RESTRICT-protected reference still blocks (PG 23503) — typically
 *      because the user is the agent_id on existing client_request rows or
 *      authored client_request_message / status_change rows — fall back to a
 *      soft delete: set status='SUSPENDED', rotate the email so it can be
 *      reused, revoke all sessions. This keeps business records intact.
 *   3. Always return a meaningful error message instead of a generic 500.
 */
export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole([...ALLOWED_USER_MANAGEMENT_ROLES]);
    const params = await props.params;
    const userId = userIdSchema.parse(params.id);

    if (userId === session.userId) {
      return NextResponse.json(
        { error: "You cannot delete the currently authenticated user." },
        { status: 400 }
      );
    }

    const sessionIdsRes = await dbPool.query<{ session_id: string }>(
      `SELECT session_id FROM public.auth_session WHERE user_id = $1`,
      [userId]
    );
    const sessionIds = sessionIdsRes.rows.map((row) => row.session_id);

    // Attempt 1: hard delete
    try {
      const res = await dbPool.query(
        `DELETE FROM public.app_user WHERE user_id = $1`,
        [userId]
      );
      if (res.rowCount === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      await Promise.all(sessionIds.map((sid) => revokeSession(sid)));
      return NextResponse.json({ message: "User deleted successfully" });
    } catch (hardErr: unknown) {
      const pgCode =
        typeof hardErr === "object" && hardErr !== null && "code" in hardErr
          ? (hardErr as { code?: string }).code
          : undefined;
      if (pgCode !== "23503") throw hardErr;

      // Attempt 2: soft delete — preserves business audit trail
      const detail =
        typeof hardErr === "object" && hardErr !== null && "table" in hardErr
          ? (hardErr as { table?: string }).table
          : undefined;

      const client = await dbPool.connect();
      try {
        await client.query("BEGIN");
        const exists = await client.query<{ email: string }>(
          `SELECT email FROM public.app_user WHERE user_id = $1 FOR UPDATE`,
          [userId]
        );
        if (exists.rows.length === 0) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const rotatedEmail = `deleted-${userId}@deleted.local`;
        await client.query(
          `UPDATE public.app_user
             SET status = 'SUSPENDED',
                 email = $2
           WHERE user_id = $1`,
          [userId, rotatedEmail]
        );
        await client.query("COMMIT");
      } catch (softErr) {
        await client.query("ROLLBACK").catch(() => {});
        throw softErr;
      } finally {
        client.release();
      }

      await Promise.all(sessionIds.map((sid) => revokeSession(sid)));
      return NextResponse.json({
        message:
          "User memiliki riwayat bisnis (mis. permintaan/pesan klien) sehingga tidak bisa dihapus permanen. Akun di-suspend & semua sesi dicabut.",
        softDeleted: true,
        blockedBy: detail ?? null,
      });
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
    console.error("DELETE /api/users/[id] failed", error);
    const msg =
      error instanceof Error ? error.message : "Gagal menghapus user";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
