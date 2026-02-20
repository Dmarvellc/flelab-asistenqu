import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

// GET agent performance for admin
export async function GET(req: Request) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get("session_admin_agency_user_id")?.value;
    if (!sessionUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get this admin's agency
    const agencyRes = await client.query(
      "SELECT agency_id FROM public.app_user WHERE user_id = $1",
      [sessionUserId]
    );
    const agencyId = agencyRes.rows[0]?.agency_id;
    if (!agencyId) return NextResponse.json({ error: "No agency found" }, { status: 404 });

    const result = await client.query(`
      SELECT
        u.user_id,
        u.email,
        COALESCE(p.full_name, u.email)            AS agent_name,
        COALESCE(ag.points_balance, 0)            AS total_points,
        COALESCE(t.name, 'Bronze')                AS rank_label,
        COALESCE(t.commission_multiplier, 1.00)   AS commission_multiplier,
        COUNT(DISTINCT cl.client_id)              AS total_clients,
        COUNT(DISTINCT c.claim_id)                AS total_claims,
        COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'APPROVED')  AS approved_claims,
        COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'REJECTED')  AS rejected_claims,
        COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status IN ('DRAFT','SUBMITTED')) AS pending_claims,
        COALESCE(SUM(c.total_amount) FILTER (WHERE c.status = 'APPROVED'), 0) AS total_approved_value,
        COALESCE(u.referral_points, 0)            AS referral_points,
        u.referral_code
      FROM public.app_user u
      LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
      LEFT JOIN public.person p ON upl.person_id = p.person_id
      -- agent table shares same PK as app_user (agent_id = user_id)
      LEFT JOIN public.agent ag ON ag.agent_id = u.user_id
      LEFT JOIN public.tier t ON ag.current_tier_id = t.tier_id
      -- clients: client.agent_id = agent.agent_id = app_user.user_id
      LEFT JOIN public.client cl ON cl.agent_id = u.user_id
      -- claims: claim.assigned_agent_id = agent.agent_id = app_user.user_id
      LEFT JOIN public.claim c ON c.assigned_agent_id = u.user_id
      WHERE u.role = 'agent' AND u.agency_id = $1
      GROUP BY
        u.user_id, u.email, p.full_name,
        ag.points_balance, t.name, t.commission_multiplier,
        u.referral_points, u.referral_code
      ORDER BY ag.points_balance DESC NULLS LAST, total_approved_value DESC
    `, [agencyId]);

    return NextResponse.json({ agents: result.rows });
  } catch (e) {
    console.error("GET agent performance error", e);
    return NextResponse.json({ error: "Failed to fetch performance data" }, { status: 500 });
  } finally {
    client.release();
  }
}
