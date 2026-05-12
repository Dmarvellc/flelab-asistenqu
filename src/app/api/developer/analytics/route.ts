import { NextResponse } from "next/server"
import { dbPool } from "@/lib/db"
import { getRoleFromCookies } from "@/lib/auth-cookies"
import { cached, CacheKeys, TTL } from "@/lib/cache"
import { logError } from "@/lib/logger"

export const dynamic = "force-dynamic"

const allowed = new Set(["developer", "super_admin"])

export async function GET() {
  const role = await getRoleFromCookies()
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const data = await cached(CacheKeys.devAnalytics(), TTL.MEDIUM, computeDevAnalytics)
    return NextResponse.json(data)
  } catch (err) {
    logError("api.developer.analytics", err, {
      requestPath: "/api/developer/analytics",
      requestMethod: "GET",
    })
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

async function computeDevAnalytics() {
  const client = await dbPool.connect()
  try {
    // 1. Daily registrations — last 30 days
    const dailyRes = await client.query(`
      SELECT
        TO_CHAR(gs::date, 'DD Mon') AS date,
        COALESCE(c.cnt, 0)::int       AS count
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '29 days')::date,
        CURRENT_DATE::date,
        '1 day'::interval
      ) AS gs
      LEFT JOIN (
        SELECT DATE(created_at) AS d, COUNT(*) AS cnt
        FROM public.client
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      ) c ON c.d = gs::date
      ORDER BY gs ASC
    `)

    // 2. Monthly registrations — last 12 months
    const monthlyRes = await client.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', gs), 'Mon YY') AS month,
        DATE_TRUNC('month', gs) AS raw_month,
        COALESCE(c.cnt, 0)::int AS count
      FROM generate_series(
        DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
        DATE_TRUNC('month', NOW()),
        '1 month'::interval
      ) AS gs
      LEFT JOIN (
        SELECT DATE_TRUNC('month', created_at) AS m, COUNT(*) AS cnt
        FROM public.client
        WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '11 months')
        GROUP BY DATE_TRUNC('month', created_at)
      ) c ON c.m = gs
      ORDER BY gs ASC
    `)

    // 3. Claims by stage
    const claimsStageRes = await client.query(`
      SELECT stage, COUNT(*)::int AS count
      FROM public.claim
      GROUP BY stage
      ORDER BY count DESC
      LIMIT 12
    `).catch(() => ({ rows: [] }))

    // 4. Users by role (ACTIVE only)
    const roleStatsRes = await client.query(`
      SELECT role, COUNT(*)::int AS count
      FROM public.app_user
      WHERE status = 'ACTIVE'
      GROUP BY role
      ORDER BY count DESC
    `)

    // 5. Users by status
    const statusRes = await client.query(`
      SELECT status, COUNT(*)::int AS count
      FROM public.app_user
      GROUP BY status
    `)

    // 6. Platform entity counts
    const totalsRes = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM public.agency)                          AS agencies,
        (SELECT COUNT(*)::int FROM public.hospital)                        AS hospitals,
        (SELECT COUNT(*)::int FROM public.agent WHERE status = 'ACTIVE')   AS active_agents,
        (SELECT COUNT(*)::int FROM public.agent)                           AS total_agents,
        (SELECT COUNT(*)::int FROM public.claim)                           AS total_claims,
        (SELECT COUNT(*)::int FROM public.app_user)                        AS total_users,
        (SELECT COUNT(*)::int FROM public.app_user WHERE status = 'ACTIVE') AS active_users,
        (SELECT COUNT(*)::int FROM public.app_user WHERE status = 'PENDING') AS pending_users,
        (SELECT COUNT(*)::int FROM public.client)                          AS total_clients
    `)

    // 7. Recent user registrations
    const recentRes = await client.query(`
      SELECT
        u.user_id, u.email, u.role, u.status,
        u.created_at,
        p.full_name
      FROM public.app_user u
      LEFT JOIN public.user_person_link l ON u.user_id = l.user_id
      LEFT JOIN public.person p ON l.person_id = p.person_id
      ORDER BY u.created_at DESC
      LIMIT 10
    `)

    // 8. Registrations by role over last 30 days
    const roleGrowthRes = await client.query(`
      SELECT role, COUNT(*)::int AS count
      FROM public.app_user
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY role
      ORDER BY count DESC
    `)

    // 9. Approved vs rejected (last 30 days)
    const approvalRateRes = await client.query(`
      SELECT
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)::int   AS approved,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END)::int AS rejected,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END)::int  AS pending
      FROM public.app_user
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    // 10. 14-day sparkline series for multiple entities
    const sparklinesRes = await client.query(`
      WITH days AS (
        SELECT gs::date AS d
        FROM generate_series(
          (CURRENT_DATE - INTERVAL '13 days')::date,
          CURRENT_DATE::date,
          '1 day'::interval
        ) gs
      )
      SELECT
        d,
        COALESCE((SELECT COUNT(*)::int FROM public.app_user WHERE DATE(created_at) = d), 0) AS users,
        COALESCE((SELECT COUNT(*)::int FROM public.agency   WHERE DATE(created_at) = d), 0) AS agencies,
        COALESCE((SELECT COUNT(*)::int FROM public.hospital WHERE DATE(created_at) = d), 0) AS hospitals,
        COALESCE((SELECT COUNT(*)::int FROM public.agent    WHERE DATE(created_at) = d), 0) AS agents
      FROM days
      ORDER BY d ASC
    `).catch(() => ({ rows: [] as Array<{ d: string; users: number; agencies: number; hospitals: number; agents: number }> }))

    // 11. WoW: current 7d vs previous 7d (users)
    const wowRes = await client.query(`
      SELECT
        SUM(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::int AS curr,
        SUM(CASE WHEN created_at <  NOW() - INTERVAL '7 days'
                 AND created_at >= NOW() - INTERVAL '14 days' THEN 1 ELSE 0 END)::int AS prev
      FROM public.app_user
    `)

    // 12. Peak hour (last 30d)
    const peakHourRes = await client.query(`
      SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
      FROM public.app_user
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).catch(() => ({ rows: [] as Array<{ hour: number; count: number }> }))

    const totals = totalsRes.rows[0] || {}
    const approval = approvalRateRes.rows[0] || {}
    const wow = wowRes.rows[0] || { curr: 0, prev: 0 }
    const peakHour = peakHourRes.rows[0] || null

    // Build sparkline arrays
    const sparkRows = sparklinesRes.rows as Array<{ d: string; users: number; agencies: number; hospitals: number; agents: number }>
    const sparklines = {
      users:     sparkRows.map(r => r.users),
      agents:    sparkRows.map(r => r.agents),
      agencies:  sparkRows.map(r => r.agencies),
      hospitals: sparkRows.map(r => r.hospitals),
    }

    return {
      dailyRegistrations: dailyRes.rows,
      monthlyRegistrations: monthlyRes.rows,
      claimsByStage: claimsStageRes.rows,
      roleStats: roleStatsRes.rows.reduce((acc: Record<string, number>, r: { role: string; count: number }) => {
        acc[r.role] = r.count; return acc
      }, {}),
      usersByStatus: statusRes.rows.reduce((acc: Record<string, number>, r: { status: string; count: number }) => {
        acc[r.status] = r.count; return acc
      }, {}),
      platformTotals: {
        agencies:     totals.agencies     ?? 0,
        hospitals:    totals.hospitals    ?? 0,
        activeAgents: totals.active_agents ?? 0,
        totalAgents:  totals.total_agents  ?? 0,
        totalClaims:  totals.total_claims  ?? 0,
        totalUsers:   totals.total_users   ?? 0,
        activeUsers:  totals.active_users  ?? 0,
        pendingUsers: totals.pending_users ?? 0,
        totalClients: totals.total_clients ?? 0,
      },
      recentUsers: recentRes.rows,
      roleGrowth30d: roleGrowthRes.rows,
      approvalRate30d: {
        approved: approval.approved ?? 0,
        rejected: approval.rejected ?? 0,
        pending:  approval.pending  ?? 0,
      },
      sparklines,
      wow: {
        current:  wow.curr ?? 0,
        previous: wow.prev ?? 0,
      },
      peakHour,
    }
  } finally {
    client.release()
  }
}
