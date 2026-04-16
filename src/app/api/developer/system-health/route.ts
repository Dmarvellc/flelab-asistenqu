import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await dbPool.connect();
    try {
        const start = Date.now();

        // DB ping
        await client.query("SELECT 1");
        const dbLatency = Date.now() - start;

        // Table sizes
        const tableSizesRes = await client.query(`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 12
    `);

        // DB size
        const dbSizeRes = await client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size
    `);

        // Active connections
        const connectionsRes = await client.query(`
      SELECT count(*) AS active FROM pg_stat_activity WHERE state = 'active'
    `);

        // Recent errors (last 24h) — count of REJECTED users as proxy
        const recentRejectionsRes = await client.query(`
      SELECT COUNT(*) AS count FROM public.app_user
      WHERE status = 'REJECTED' AND created_at > NOW() - INTERVAL '24 hours'
    `);

        // User growth last 7 days
        const growthRes = await client.query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS count
      FROM public.app_user
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `);

        // Claims last 7 days
        const claimsGrowthRes = await client.query(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*) AS count
      FROM public.claim
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `).catch(() => ({ rows: [] }));

        // Agency stats
        const agencyStatsRes = await client.query(`
      SELECT
        a.agency_id,
        a.name,
        COUNT(DISTINCT u.user_id) AS agent_count,
        COUNT(DISTINCT c.claim_id) AS claim_count,
        a.created_at
      FROM public.agency a
      LEFT JOIN public.app_user u ON u.agency_id = a.agency_id AND u.role = 'agent'
      LEFT JOIN public.claim c ON c.agency_id = a.agency_id
      GROUP BY a.agency_id, a.name, a.created_at
      ORDER BY agent_count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

        // Hospital stats
        const hospitalStatsRes = await client.query(`
      SELECT
        h.hospital_id,
        h.name,
        COUNT(DISTINCT ur.user_id) AS admin_count,
        h.created_at
      FROM public.hospital h
      LEFT JOIN public.user_role ur ON ur.scope_id = h.hospital_id AND ur.scope_type = 'HOSPITAL'
      GROUP BY h.hospital_id, h.name, h.created_at
      ORDER BY h.created_at DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

        // Top agents by claims
        const topAgentsRes = await client.query(`
      SELECT
        p.full_name,
        u.email,
        COUNT(c.claim_id) AS claim_count,
        u.status,
        u.created_at
      FROM public.app_user u
      LEFT JOIN public.user_person_link l ON l.user_id = u.user_id
      LEFT JOIN public.person p ON p.person_id = l.person_id
      LEFT JOIN public.claim c ON c.agent_id = u.user_id
      WHERE u.role = 'agent'
      GROUP BY p.full_name, u.email, u.status, u.created_at
      ORDER BY claim_count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

        return NextResponse.json({
            dbLatency,
            dbSize: dbSizeRes.rows[0]?.db_size ?? "N/A",
            activeConnections: parseInt(connectionsRes.rows[0]?.active ?? "0"),
            recentRejections: parseInt(recentRejectionsRes.rows[0]?.count ?? "0"),
            tableSizes: tableSizesRes.rows,
            userGrowth7d: growthRes.rows,
            claimsGrowth7d: claimsGrowthRes.rows,
            agencyStats: agencyStatsRes.rows,
            hospitalStats: hospitalStatsRes.rows,
            topAgents: topAgentsRes.rows,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("System health error:", error);
        return NextResponse.json({ error: "Failed to fetch system health" }, { status: 500 });
    } finally {
        client.release();
    }
}
