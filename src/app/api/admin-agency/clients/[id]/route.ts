import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession({ portal: "admin_agency" });
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = await dbPool.connect();
  
  try {
    // 1. Fetch Client Detail
    const clientRes = await db.query(
      `SELECT
          c.client_id,
          c.status,
          c.created_at,
          p.person_id,
          p.full_name,
          p.id_card             AS nik,
          p.id_card,
          p.phone_number,
          p.email,
          p.address,
          p.birth_date::text,
          p.gender,
          p.occupation,
          p.marital_status,
          p.passport_number,
          ap.full_name          AS agent_name,
          au.user_id            AS agent_id,
          au.email              AS agent_email,
          a.agency_id,
          a.name                AS agency_name,
          (SELECT COUNT(*)::int FROM public.contract ct
           WHERE ct.client_id = c.client_id)                                     AS total_policies,
          (SELECT COUNT(*)::int FROM public.claim cl
           JOIN public.contract ct ON cl.contract_id = ct.contract_id
           WHERE ct.client_id = c.client_id)                                     AS total_claims
       FROM public.client c
       LEFT JOIN public.person p ON c.person_id = p.person_id
       LEFT JOIN public.app_user au ON c.agent_id = au.user_id
       LEFT JOIN public.user_person_link upl ON au.user_id = upl.user_id
       LEFT JOIN public.person ap ON upl.person_id = ap.person_id
       LEFT JOIN public.agency a ON au.agency_id = a.agency_id
       WHERE c.client_id = $1
       LIMIT 1`,
      [id]
    );

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Klien tidak ditemukan di database." }, { status: 404 });
    }

    // 2. Fetch Contracts (Policies)
    const contractsRes = await db.query(
      `SELECT 
         con.contract_id, con.contract_number, con.contract_product,
         con.contract_startdate, con.contract_duedate, con.status,
         con.policy_url, con.insurance_company_name,
         con.policy_type, con.policy_status, con.underwriting_status,
         con.issue_date, con.next_due_date, con.due_day,
         con.grace_period_days, con.reinstatement_period,
         con.policy_term_years, con.premium_payment_term, con.currency,
         cd.sum_insured, cd.payment_type, cd.premium_amount,
         cd.premium_frequency, cd.coverage_area, cd.room_plan,
         cd.annual_limit, cd.lifetime_limit, cd.deductible, cd.coinsurance_pct,
         cd.waiting_period_days, cd.pre_existing_covered, cd.cashless_network,
         cd.benefit_life, cd.benefit_accidental_death, cd.benefit_disability, cd.benefit_critical,
         cd.benefit_hospitalization, cd.benefit_icu, cd.benefit_surgery, cd.benefit_outpatient,
         cd.benefit_daily_cash, cd.benefit_maternity, cd.benefit_dental, cd.benefit_optical,
         cd.benefit_ambulance, cd.benefit_medical_checkup,
         cd.payment_method, cd.bank_name, cd.account_number, cd.account_holder_name,
         cd.card_expiry, cd.card_network, cd.virtual_account_number,
         cd.autodebet_start_date, cd.autodebet_end_date, cd.autodebet_mandate_ref, cd.billing_cycle_day
       FROM public.contract con
       LEFT JOIN public.contract_detail cd ON con.contract_id = cd.contract_id
       WHERE con.client_id = $1
       ORDER BY con.created_at DESC`,
      [id]
    );

    const contractIds = contractsRes.rows.map((r) => r.contract_id);

    let beneficiariesRes = { rows: [] as Array<Record<string, unknown>> };
    let ridersRes = { rows: [] as Array<Record<string, unknown>> };
    let insuredRes = { rows: [] as Array<Record<string, unknown>> };

    if (contractIds.length > 0) {
      beneficiariesRes = await db.query(
        `SELECT * FROM public.beneficiary WHERE contract_id = ANY($1::uuid[])`,
        [contractIds]
      );
      ridersRes = await db.query(
        `SELECT * FROM public.rider WHERE contract_id = ANY($1::uuid[])`,
        [contractIds]
      );
      insuredRes = await db.query(
        `SELECT * FROM public.insured_person WHERE contract_id = ANY($1::uuid[])`,
        [contractIds]
      );
    }

    const contracts = contractsRes.rows.map((c) => ({
      ...c,
      beneficiaries: beneficiariesRes.rows.filter((b) => b.contract_id === c.contract_id),
      riders: ridersRes.rows.filter((r) => r.contract_id === c.contract_id),
      insured: insuredRes.rows.find((i) => i.contract_id === c.contract_id) || null,
    }));

    // 3. Fetch Latest Claim
    const latestClaimRes = await db.query(
      `SELECT claim_id, hospital_id, status
       FROM public.claim WHERE client_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    return NextResponse.json({
      client: clientRes.rows[0],
      contracts,
      latestClaim: latestClaimRes.rows[0] ?? null,
    });
  } catch (err: any) {
    console.error("developer.clients.GET Error:", err);
    return NextResponse.json({ 
      error: "Gagal memuat data klien.", 
      details: err.message 
    }, { status: 500 });
  } finally {
    db.release();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession({ portal: "admin_agency" });
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { full_name, phone_number, email, address } = body as Record<string, string | undefined>;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
  }

  const db = await dbPool.connect();
  try {
    const clientRes = await db.query(
      "SELECT person_id FROM public.client WHERE client_id = $1",
      [id]
    );
    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Klien tidak ditemukan." }, { status: 404 });
    }

    const personId = clientRes.rows[0].person_id as string;

    await db.query(
      `UPDATE public.person SET
          full_name    = $1,
          phone_number = COALESCE($2, phone_number),
          email        = COALESCE($3, email),
          address      = COALESCE($4, address)
       WHERE person_id = $5`,
      [
        full_name.trim(),
        phone_number?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        personId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("developer.clients.PATCH", err);
    return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  } finally {
    db.release();
  }
}
