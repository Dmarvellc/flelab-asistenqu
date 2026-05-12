import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";
import { logError } from "@/lib/logger";

const allowed = new Set(["developer", "super_admin"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = await dbPool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          c.claim_id,
          c.claim_number,
          c.claim_date::text,
          c.status,
          c.stage,
          c.total_amount,
          c.notes,
          p.full_name as client_name,
          d.name as disease_name,
          h.name as hospital_name,
          ct.contract_number as policy_number,
          c.created_at,
          c.created_by_user_id,
          ag.name as agency_name,
          i.insurance_name,
          c.log_number,
          c.log_issued_at,
          c.log_sent_to_hospital_at
        FROM public.claim c
        JOIN public.client cl ON c.client_id = cl.client_id
        JOIN public.person p ON cl.person_id = p.person_id
        LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
        LEFT JOIN public.disease d ON c.disease_id = d.disease_id
        LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
        LEFT JOIN public.agent a ON c.created_by_user_id = a.agent_id
        LEFT JOIN public.agency ag ON a.agency_id = ag.agency_id
        LEFT JOIN public.insurance i ON a.insurance_id = i.insurance_id
        WHERE c.claim_id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      const claim = result.rows[0];
      claim.total_amount = Number(claim.total_amount);

      return NextResponse.json({ claim });
    } finally {
      client.release();
    }
  } catch (err) {
    logError("api.developer.claims.detail", err, {
      requestPath: `/api/developer/claims/${id}`,
      requestMethod: "GET",
    });
    return NextResponse.json(
      { error: "Failed to fetch claim" },
      { status: 500 }
    );
  }
}
