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
        h.hospital_id,
        h.name,
        h.address,
        COUNT(DISTINCT ur.user_id)::int AS admin_count
      FROM public.hospital h
      LEFT JOIN public.user_role ur ON ur.scope_type = 'HOSPITAL' AND ur.scope_id = h.hospital_id
      GROUP BY h.hospital_id, h.name, h.address
      ORDER BY h.name ASC
    `)

    return NextResponse.json({ hospitals: res.rows })
  } catch {
    return NextResponse.json({ hospitals: [] })
  } finally {
    client.release()
  }
}
