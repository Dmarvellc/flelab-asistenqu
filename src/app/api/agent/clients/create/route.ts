import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/auth";

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};
const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
};
const toDate = (v: unknown): string | null => (v ? String(v) : null);

export async function POST(req: Request) {
  const client = await dbPool.connect();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    const body = await req.json();

    /* ── Save uploaded policy file ────────────────────────────── */
    let policyUrl: string | null = null;
    if (body.policyFileBase64) {
      try {
        const matches = String(body.policyFileBase64).match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const type = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          let ext = ".bin";
          if (type.includes("jpeg") || type.includes("jpg")) ext = ".jpg";
          else if (type.includes("png")) ext = ".png";
          else if (type.includes("pdf")) ext = ".pdf";
          const uploadsDir = path.join(process.cwd(), "public", "uploads", "policies");
          await mkdir(uploadsDir, { recursive: true });
          const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
          await writeFile(path.join(uploadsDir, fileName), buffer);
          policyUrl = `/uploads/policies/${fileName}`;
        }
      } catch (e) {
        console.error("Failed to save policy file", e);
      }
    }

    await client.query("BEGIN");

    /* ── Ensure agent + insurance exist ───────────────────────── */
    let insuranceId;
    const insuranceRes = await client.query("SELECT insurance_id FROM public.insurance LIMIT 1");
    if (insuranceRes.rows.length > 0) {
      insuranceId = insuranceRes.rows[0].insurance_id;
    } else {
      const newIns = await client.query(
        "INSERT INTO public.insurance (insurance_name) VALUES ($1) RETURNING insurance_id",
        ["Default Insurance"]
      );
      insuranceId = newIns.rows[0].insurance_id;
    }

    const agentRes = await client.query("SELECT agent_id FROM public.agent WHERE agent_id = $1", [userId]);
    const agentId = userId;
    if (agentRes.rows.length === 0) {
      const userPersonRes = await client.query(
        `SELECT p.full_name FROM public.user_person_link upl
         JOIN public.person p ON upl.person_id = p.person_id
         WHERE upl.user_id = $1`,
        [userId]
      );
      const agentName = userPersonRes.rows[0]?.full_name || "Agent " + String(userId).substring(0, 8);
      await client.query(
        `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [agentId, agentName, insuranceId]
      );
    }

    /* ── Person (policy holder) ───────────────────────────────── */
    const personRes = await client.query(
      `INSERT INTO public.person (full_name, id_card, phone_number, address, birth_date, gender, email, occupation, marital_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING person_id`,
      [
        body.fullName,
        body.nik,
        body.phoneNumber,
        body.address,
        toDate(body.birthDate),
        body.gender,
        body.email,
        body.occupation || null,
        body.maritalStatus || null,
      ]
    );
    const personId = personRes.rows[0].person_id;

    const clientRes = await client.query(
      `INSERT INTO public.client (agent_id, person_id, status)
       VALUES ($1,$2,'ACTIVE')
       RETURNING client_id`,
      [agentId, personId]
    );
    const clientId = clientRes.rows[0].client_id;

    /* ── Contract ─────────────────────────────────────────────── */
    const existingContract = await client.query(
      "SELECT contract_id FROM public.contract WHERE contract_number = $1",
      [body.policyNumber]
    );
    if (existingContract.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Nomor polis sudah terdaftar dalam sistem." }, { status: 409 });
    }

    const contractRes = await client.query(
      `INSERT INTO public.contract (
         client_id, contract_number, contract_product,
         contract_startdate, contract_duedate, status,
         policy_url, insurance_company_name,
         policy_type, policy_status, underwriting_status,
         issue_date, next_due_date, due_day,
         grace_period_days, reinstatement_period,
         policy_term_years, premium_payment_term, currency
       )
       VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING contract_id`,
      [
        clientId,
        body.policyNumber || `POL-${Date.now()}`,
        body.productName,
        toDate(body.startDate),
        toDate(body.endDate),
        policyUrl,
        body.insuranceCompany,
        body.policyType || null,
        body.policyStatus || "AKTIF",
        body.underwritingStatus || "STANDARD",
        toDate(body.issueDate),
        toDate(body.nextDueDate),
        toInt(body.dueDay),
        toInt(body.gracePeriodDays) ?? 30,
        toInt(body.reinstatementPeriod) ?? 24,
        toInt(body.policyTerm),
        toInt(body.premiumPaymentTerm),
        body.currency || "IDR",
      ]
    );
    const contractId = contractRes.rows[0].contract_id;

    /* ── Contract Detail ──────────────────────────────────────── */
    await client.query(
      `INSERT INTO public.contract_detail (
         contract_id, sum_insured, payment_type, premium_amount,
         premium_frequency, coverage_area, room_plan,
         annual_limit, lifetime_limit, deductible, coinsurance_pct,
         waiting_period_days, pre_existing_covered, cashless_network,
         benefit_life, benefit_accidental_death, benefit_disability, benefit_critical,
         benefit_hospitalization, benefit_icu, benefit_surgery, benefit_outpatient,
         benefit_daily_cash, benefit_maternity, benefit_dental, benefit_optical,
         benefit_ambulance, benefit_medical_checkup,
         payment_method, bank_name, account_number, account_holder_name,
         card_expiry, card_network, virtual_account_number,
         autodebet_start_date, autodebet_end_date, autodebet_mandate_ref, billing_cycle_day
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
         $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
         $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39
       )`,
      [
        contractId,
        toNum(body.sumInsured) ?? 0,
        body.premiumFrequency || "MONTHLY",
        toNum(body.premiumAmount) ?? 0,
        body.premiumFrequency || "MONTHLY",
        body.coverageArea || "INDONESIA",
        body.roomPlan || null,
        toNum(body.annualLimit),
        toNum(body.lifetimeLimit),
        toNum(body.deductible),
        toNum(body.coinsurancePct),
        toInt(body.waitingPeriodDays) ?? 30,
        body.preExistingCovered || "NO",
        body.cashlessNetwork || null,
        toNum(body.benefitLife),
        toNum(body.benefitAccidentalDeath),
        toNum(body.benefitDisability),
        toNum(body.benefitCritical),
        toNum(body.benefitHospitalization),
        toNum(body.benefitIcu),
        toNum(body.benefitSurgery),
        toNum(body.benefitOutpatient),
        toNum(body.benefitDailyCash),
        toNum(body.benefitMaternity),
        toNum(body.benefitDental),
        toNum(body.benefitOptical),
        toNum(body.benefitAmbulance),
        toNum(body.benefitMedicalCheckup),
        body.paymentMethod || null,
        body.bankName || null,
        body.accountNumber || null,
        body.accountHolderName || null,
        body.cardExpiry || null,
        body.cardNetwork || null,
        body.virtualAccountNumber || null,
        toDate(body.autodebetStartDate),
        toDate(body.autodebetEndDate),
        body.autodebetMandateRef || null,
        toInt(body.billingCycleDay),
      ]
    );

    /* ── Beneficiaries ────────────────────────────────────────── */
    if (Array.isArray(body.beneficiaries)) {
      for (const b of body.beneficiaries) {
        if (!b?.name) continue;
        await client.query(
          `INSERT INTO public.beneficiary (contract_id, full_name, relationship, percentage, nik)
           VALUES ($1,$2,$3,$4,$5)`,
          [contractId, b.name, b.relationship || "LAINNYA", toNum(b.percentage) ?? 100, b.nik || null]
        );
      }
    }

    /* ── Riders ───────────────────────────────────────────────── */
    if (Array.isArray(body.riders)) {
      for (const r of body.riders) {
        if (!r?.name) continue;
        await client.query(
          `INSERT INTO public.rider (contract_id, rider_name, coverage)
           VALUES ($1,$2,$3)`,
          [contractId, r.name, toNum(r.coverage)]
        );
      }
    }

    /* ── Insured (bila berbeda dari pemegang polis) ──────────── */
    if (body.insuredSameAsPolicyholder === false && body.insuredName) {
      await client.query(
        `INSERT INTO public.insured_person (contract_id, full_name, nik, birth_date, gender, relationship)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          contractId,
          body.insuredName,
          body.insuredNIK || null,
          toDate(body.insuredBirthDate),
          body.insuredGender || null,
          body.insuredRelationship || null,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, clientId, contractId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create client failed", error);
    return NextResponse.json({ error: "Gagal membuat data klien. Silakan coba lagi." }, { status: 500 });
  } finally {
    client.release();
  }
}
