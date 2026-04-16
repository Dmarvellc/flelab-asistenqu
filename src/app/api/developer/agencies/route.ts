import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"
import { getRoleFromCookies } from "@/lib/auth-cookies"

export const dynamic = "force-dynamic"

const allowed = new Set(["developer", "super_admin"])

export async function GET() {
  const role = await getRoleFromCookies()
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const client = await dbPool.connect()
  try {
    const res = await client.query(`
      SELECT
        a.agency_id,
        a.name,
        a.address,
        a.created_at,
        COUNT(DISTINCT u.user_id)::int AS user_count,
        COUNT(DISTINCT CASE WHEN u.status = 'ACTIVE' THEN u.user_id END)::int AS active_count
      FROM public.agency a
      LEFT JOIN public.app_user u ON u.agency_id = a.agency_id
      GROUP BY a.agency_id, a.name, a.address, a.created_at
      ORDER BY a.created_at DESC
    `)

    return NextResponse.json({ agencies: res.rows })
  } catch {
    return NextResponse.json({ agencies: [] })
  } finally {
    client.release()
  }
}
