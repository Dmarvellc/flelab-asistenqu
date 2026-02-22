import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { extractClaimNotes } from "@/lib/claim-form-meta";

// GET claim PDF data (returns all structured data for PDF generation)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const result = await client.query(`
      SELECT
        c.claim_id,
        c.claim_number,
        c.claim_date,
        c.status,
        c.stage,
        c.total_amount,
        c.notes,
        c.log_number,
        c.log_issued_at,
        c.insurance_name,
        c.insurance_contact,
        c.created_at,

        -- Client / Patient
        p.full_name        AS client_name,
        p.id_card          AS nik,
        p.birth_date,
        p.gender,
        p.phone_number,
        p.address,

        -- Hospital
        h.name             AS hospital_name,
        h.address          AS hospital_address,

        -- Disease
        d.name             AS disease_name,
        d.icd10_code,

        -- Agent
        agent_person.full_name AS agent_name,
        agent_user.email       AS agent_email,
        agent_user.referral_code AS agent_referral_code,

        -- Contract / Policy
        con.contract_number,
        con.contract_product      AS product_name,
        con.contract_startdate    AS policy_start,
        con.contract_duedate      AS policy_end,
        NULL::NUMERIC             AS premium_amount,

        -- Coverage periods
        COALESCE(
          json_agg(
            json_build_object(
              'type', cp.period_type,
              'start_date', cp.start_date,
              'end_date', cp.end_date,
              'amount', cp.amount,
              'description', cp.description,
              'is_eligible', cp.is_eligible
            )
          ) FILTER (WHERE cp.coverage_id IS NOT NULL), '[]'
        ) AS coverage_periods,

        -- Documents
        COALESCE(
          (SELECT json_agg(json_build_object(
            'file_url', cd.file_url,
            'created_at', cd.created_at
          )) FROM public.claim_document cd WHERE cd.claim_id = c.claim_id), '[]'
        ) AS documents

      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p  ON cl.person_id = p.person_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      LEFT JOIN public.disease d  ON c.disease_id  = d.disease_id
      LEFT JOIN public.app_user agent_user ON c.created_by_user_id = agent_user.user_id
      LEFT JOIN public.user_person_link agent_upl ON agent_user.user_id = agent_upl.user_id
      LEFT JOIN public.person agent_person ON agent_upl.person_id = agent_person.person_id
      LEFT JOIN public.contract con ON c.contract_id = con.contract_id
      LEFT JOIN public.claim_coverage_period cp ON cp.claim_id = c.claim_id
      WHERE c.claim_id = $1 AND c.created_by_user_id = $2
      GROUP BY
        c.claim_id, c.claim_number, c.claim_date, c.status, c.stage,
        c.total_amount, c.notes, c.log_number, c.log_issued_at,
        c.insurance_name, c.insurance_contact, c.created_at,
        p.full_name, p.id_card, p.birth_date, p.gender, p.phone_number, p.address,
        h.name, h.address, d.name, d.icd10_code,
        agent_person.full_name, agent_user.email, agent_user.referral_code,
        con.contract_number, con.contract_product, con.contract_startdate, con.contract_duedate
    `, [id, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const row = result.rows[0];
    const parsed = extractClaimNotes(row.notes);

    return NextResponse.json({
      claim_data: {
        ...row,
        meta: parsed.meta || {},
        plain_notes: parsed.plainNotes || "",
      }
    });
  } catch (e) {
    console.error("GET claim PDF data error", e);
    return NextResponse.json({ error: "Failed to fetch claim data" }, { status: 500 });
  } finally {
    client.release();
  }
}
