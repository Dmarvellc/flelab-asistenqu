import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface OrgMember {
  member_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  member_role: "master_admin" | "admin" | "manager" | "agent";
  member_status: string;
  joined_at: string | null;
  created_at: string;
  total_clients: number;
  total_active_contracts: number;
}

export interface OrgAgency {
  agency_id: string;
  name: string;
  slug: string | null;
  status: string;
  created_at: string;
  logo_url: string | null;
  primary_color: string | null;
}

export interface OrgStats {
  total_members: number;
  total_master_admin: number;
  total_admin: number;
  total_manager: number;
  total_agent: number;
  total_clients: number;
  total_active_contracts: number;
  pending_invitations: number;
}

export interface OrgResponse {
  agency: OrgAgency;
  stats: OrgStats;
  members: OrgMember[];
  pending_invitations: Array<{
    invitation_id: string;
    email: string;
    full_name: string | null;
    agency_role: string;
    expires_at: string;
    created_at: string;
    invited_by_email: string | null;
  }>;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agencyId = session.agencyId;

    // Fetch agency details
    const { rows: agencyRows } = await dbPool.query<OrgAgency>(
      `SELECT agency_id, name, slug, status, created_at, logo_url, primary_color
       FROM public.agency
       WHERE agency_id = $1`,
      [agencyId],
    );

    if (agencyRows.length === 0) {
      return NextResponse.json({ error: "Agency tidak ditemukan" }, { status: 404 });
    }

    // Fetch all active members with client counts
    const { rows: memberRows } = await dbPool.query<OrgMember>(
      `SELECT
         m.member_id,
         m.role       AS member_role,
         m.status     AS member_status,
         m.joined_at,
         m.created_at,
         u.user_id,
         u.email,
         p.full_name,
         p.phone_number,
         COALESCE(
           (SELECT COUNT(*)::int FROM public.client c WHERE c.agent_id = u.user_id),
           0
         ) AS total_clients,
         COALESCE(
           (SELECT COUNT(*)::int
            FROM public.contract ct
            JOIN public.client c2 ON c2.client_id = ct.client_id
            WHERE c2.agent_id = u.user_id
              AND ct.status IN ('ACTIVE', 'active')),
           0
         ) AS total_active_contracts
       FROM public.agency_member m
       JOIN public.app_user u ON u.user_id = m.user_id
       LEFT JOIN public.user_person_link l ON l.user_id = u.user_id
       LEFT JOIN public.person p ON p.person_id = l.person_id
       WHERE m.agency_id = $1
         AND m.status = 'ACTIVE'
       ORDER BY
         CASE m.role
           WHEN 'master_admin' THEN 1
           WHEN 'admin'        THEN 2
           WHEN 'manager'      THEN 3
           WHEN 'agent'        THEN 4
           ELSE 5
         END,
         m.joined_at ASC`,
      [agencyId],
    );

    // Fetch pending invitations
    const { rows: inviteRows } = await dbPool.query(
      `SELECT
         i.invitation_id,
         i.email,
         i.full_name,
         i.agency_role,
         i.expires_at,
         i.created_at,
         inv.email AS invited_by_email
       FROM public.agency_invitation i
       LEFT JOIN public.app_user inv ON inv.user_id = i.invited_by_user_id
       WHERE i.agency_id = $1
         AND i.accepted_at IS NULL
         AND i.revoked_at IS NULL
         AND i.expires_at > now()
       ORDER BY i.created_at DESC`,
      [agencyId],
    );

    // Aggregate stats
    const totalClients: number = await dbPool
      .query<{ cnt: string }>(
        `SELECT COUNT(DISTINCT c.client_id)::text AS cnt
         FROM public.client c
         JOIN public.agency_member m ON m.user_id = c.agent_id
         WHERE m.agency_id = $1 AND m.status = 'ACTIVE'`,
        [agencyId],
      )
      .then((r) => parseInt(r.rows[0]?.cnt ?? "0", 10))
      .catch(() => 0);

    const totalActiveContracts: number = await dbPool
      .query<{ cnt: string }>(
        `SELECT COUNT(*)::text AS cnt
         FROM public.contract ct
         JOIN public.client c ON c.client_id = ct.client_id
         JOIN public.agency_member m ON m.user_id = c.agent_id
         WHERE m.agency_id = $1
           AND m.status = 'ACTIVE'
           AND ct.status IN ('ACTIVE', 'active')`,
        [agencyId],
      )
      .then((r) => parseInt(r.rows[0]?.cnt ?? "0", 10))
      .catch(() => 0);

    const stats: OrgStats = {
      total_members: memberRows.length,
      total_master_admin: memberRows.filter((m) => m.member_role === "master_admin").length,
      total_admin: memberRows.filter((m) => m.member_role === "admin").length,
      total_manager: memberRows.filter((m) => m.member_role === "manager").length,
      total_agent: memberRows.filter((m) => m.member_role === "agent").length,
      total_clients: totalClients,
      total_active_contracts: totalActiveContracts,
      pending_invitations: inviteRows.length,
    };

    const response: OrgResponse = {
      agency: agencyRows[0],
      stats,
      members: memberRows,
      pending_invitations: inviteRows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[organization] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data organisasi" }, { status: 500 });
  }
}
