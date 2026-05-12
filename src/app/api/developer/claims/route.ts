import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";
import { cached, CacheKeys, TTL } from "@/lib/cache";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const claims = await cached(
      CacheKeys.devClaims(),
      TTL.SHORT,
      fetchDeveloperClaims
    );
    return NextResponse.json({ claims });
  } catch (err) {
    logError("api.developer.claims", err, {
      requestPath: "/api/developer/claims",
      requestMethod: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

async function fetchDeveloperClaims() {
  const client = await dbPool.connect();
  try {
    const result = await client.query(`
      SELECT 
        c.claim_id,
        c.claim_number,
        c.claim_date::text,
        c.status,
        c.stage,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name,
        ct.contract_number as policy_number,
        c.created_at,
        c.created_by_user_id,
        ag.name as agency_name,
        i.insurance_name
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      LEFT JOIN public.agent a ON c.created_by_user_id = a.agent_id
      LEFT JOIN public.agency ag ON a.agency_id = ag.agency_id
      LEFT JOIN public.insurance i ON a.insurance_id = i.insurance_id
      WHERE c.status != 'DRAFT'
      ORDER BY c.created_at DESC
      LIMIT 100
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.rows.map((row: any) => ({
      ...row,
      total_amount: Number(row.total_amount),
    }));
  } finally {
    client.release();
  }
}
