import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    const clientRes = await client.query(
      `SELECT 
        c.client_id,
        p.full_name, p.phone_number, p.address,
        p.birth_date, p.gender, p.id_card, p.passport_number, p.email,
        p.occupation, p.marital_status,
        c.status, c.created_at
       FROM public.client c
       JOIN public.person p ON c.person_id = p.person_id
       WHERE c.client_id = $1 AND c.agent_id = $2`,
      [id, userId]
    );

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contractsRes = await client.query(
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
      beneficiariesRes = await client.query(
        `SELECT * FROM public.beneficiary WHERE contract_id = ANY($1::uuid[])`,
        [contractIds]
      );
      ridersRes = await client.query(
        `SELECT * FROM public.rider WHERE contract_id = ANY($1::uuid[])`,
        [contractIds]
      );
      insuredRes = await client.query(
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

    const latestClaimRes = await client.query(
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
  } catch (error) {
    console.error("Fetch client detail failed", error);
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  } finally {
    client.release();
  }
}
