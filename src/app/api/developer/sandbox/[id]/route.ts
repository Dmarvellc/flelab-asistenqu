import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"
import { getRoleFromCookies } from "@/lib/auth-cookies"

const ALLOWED_ROLES = new Set(["developer", "super_admin"])

// ── DELETE /api/developer/sandbox/[id] ──────────────────────────────────────
// Hard-wipes every database row created for this sandbox session:
//   user_role → agency_member → agent → app_user → user_person_link
//   → person → agency → hospital → sandbox_session
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRoleFromCookies()
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: sessionId } = await params

  const client = await dbPool.connect()
  try {
    await client.query("BEGIN")

    // Fetch session so we know which agencies/hospitals were created
    const sessionRes = await client.query(
      "SELECT metadata, status FROM public.sandbox_session WHERE session_id = $1",
      [sessionId]
    )
    if (sessionRes.rows.length === 0) {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    if (sessionRes.rows[0].status === "DESTROYED") {
      await client.query("ROLLBACK")
      return NextResponse.json({ error: "Already destroyed" }, { status: 409 })
    }

    const metadata = sessionRes.rows[0].metadata as {
      agency_id?: string
      hospital_id?: string
    }

    // 1. Collect all sandbox user_ids for this session
    const userRes = await client.query(
      "SELECT user_id FROM public.app_user WHERE sandbox_session_id = $1",
      [sessionId]
    )
    const userIds: string[] = userRes.rows.map((r: { user_id: string }) => r.user_id)

    if (userIds.length > 0) {
      const ids = userIds.map((_, i) => `$${i + 1}`).join(",")

      // 2. Delete auth_session rows
      await client.query(
        `DELETE FROM public.auth_session WHERE user_id IN (${ids})`,
        userIds
      ).catch(() => {/* table might not exist */})

      // 3. Delete user_role
      await client.query(
        `DELETE FROM public.user_role WHERE user_id IN (${ids})`,
        userIds
      ).catch(() => {})

      // 4. Delete agency_member
      await client.query(
        `DELETE FROM public.agency_member WHERE user_id IN (${ids})`,
        userIds
      ).catch(() => {})

      // 5. Delete agent records
      await client.query(
        `DELETE FROM public.agent WHERE agent_id IN (${ids})`,
        userIds
      ).catch(() => {})

      // 6. Collect person_ids linked to these users
      const personRes = await client.query(
        `SELECT person_id FROM public.user_person_link WHERE user_id IN (${ids})`,
        userIds
      )
      const personIds: string[] = personRes.rows.map((r: { person_id: string }) => r.person_id)

      // 7. Delete user_person_link
      await client.query(
        `DELETE FROM public.user_person_link WHERE user_id IN (${ids})`,
        userIds
      )

      // 8. Delete person rows (only sandbox-created ones)
      if (personIds.length > 0) {
        const pids = personIds.map((_, i) => `$${i + 1}`).join(",")
        await client.query(
          `DELETE FROM public.person WHERE person_id IN (${pids})`,
          personIds
        ).catch(() => {})
      }

      // 9. Delete app_user
      await client.query(
        `DELETE FROM public.app_user WHERE user_id IN (${ids})`,
        userIds
      )
    }

    // 10. Delete sandbox-created agency
    if (metadata?.agency_id) {
      await client.query(
        "DELETE FROM public.agency WHERE agency_id = $1",
        [metadata.agency_id]
      ).catch(() => {})
    }

    // 11. Delete sandbox-created hospital
    if (metadata?.hospital_id) {
      await client.query(
        "DELETE FROM public.hospital WHERE hospital_id = $1",
        [metadata.hospital_id]
      ).catch(() => {})
    }

    // 12. Mark session as DESTROYED (keep the row for audit log)
    await client.query(
      `UPDATE public.sandbox_session
       SET status = 'DESTROYED', destroyed_at = now()
       WHERE session_id = $1`,
      [sessionId]
    )

    await client.query("COMMIT")

    return NextResponse.json({
      ok: true,
      session_id: sessionId,
      users_deleted: userIds.length,
    })
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[sandbox] destroy failed:", err)
    return NextResponse.json(
      { error: "Destroy failed", detail: String(err) },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

// ── GET /api/developer/sandbox/[id] ─────────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRoleFromCookies()
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: sessionId } = await params
  const { rows } = await dbPool.query(
    "SELECT * FROM public.sandbox_session WHERE session_id = $1",
    [sessionId]
  )
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(rows[0])
}
