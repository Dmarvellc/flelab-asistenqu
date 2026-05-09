import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadPolicyFile, ensureAgentRecord } from "@/lib/storage";

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
  const dbClient = await dbPool.connect();

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Izinkan: agent, agent_manager, admin_agency, insurance_admin, super_admin
    const allowedRoles = ["agent", "agent_manager", "admin_agency", "insurance_admin", "super_admin"];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = session.userId;
    const body = await req.json();

    // ── Upload file polis ke cloud storage ──────────────────────
    let policyUrl: string | null = null;
    if (body.policyFileBase64) {
      policyUrl = await uploadPolicyFile(String(body.policyFileBase64));
    }

    await dbClient.query("BEGIN");

    // ── Pastikan agent record ada ────────────────────────────────
    // Admin agency yang bertindak sebagai agent juga perlu agent record
    const userPersonRes = await dbClient.query(
      `SELECT p.full_name FROM public.user_person_link upl
       JOIN public.person p ON upl.person_id = p.person_id
       WHERE upl.user_id = $1`,
      [userId],
    );
    const callerName = userPersonRes.rows[0]?.full_name ?? `User-${String(userId).slice(0, 8)}`;
    await ensureAgentRecord(dbClient, userId, callerName);

    // ── Deduplication NIK ────────────────────────────────────────
    // Jika NIK sudah ada, pakai person yang sudah ada (tidak buat duplikat)
    let personId: string;
    const nikValue = body.nik ? String(body.nik).trim() : null;

    if (nikValue) {
      const existingPerson = await dbClient.query(
        "SELECT person_id FROM public.person WHERE id_card = $1 LIMIT 1",
        [nikValue],
      );

      if (existingPerson.rows.length > 0) {
        personId = existingPerson.rows[0].person_id;

        // Cek apakah person ini sudah punya client record yang aktif di agency yang sama
        const existingClient = await dbClient.query(
          `SELECT c.client_id, u.agency_id
           FROM public.client c
           JOIN public.app_user u ON c.agent_id = u.user_id
           WHERE c.person_id = $1
           LIMIT 1`,
          [personId],
        );

        // Tolak jika sudah terdaftar sebagai klien di agency yang sama
        if (existingClient.rows.length > 0) {
          const existingAgencyId = existingClient.rows[0].agency_id;
          if (existingAgencyId === session.agencyId) {
            await dbClient.query("ROLLBACK");
            return NextResponse.json(
              { error: "Klien dengan NIK ini sudah terdaftar di agensi Anda." },
              { status: 409 },
            );
          }
        }

        // Update data person yang ada (mungkin ada data baru yang lebih lengkap)
        await dbClient.query(
          `UPDATE public.person SET
             full_name = COALESCE($1, full_name),
             phone_number = COALESCE($2, phone_number),
             address = COALESCE($3, address),
             birth_date = COALESCE($4, birth_date),
             gender = COALESCE($5, gender),
             email = COALESCE($6, email),
             occupation = COALESCE($7, occupation),
             marital_status = COALESCE($8, marital_status)
           WHERE person_id = $9`,
          [
            body.fullName || null,
            body.phoneNumber || null,
            body.address || null,
            toDate(body.birthDate),
            body.gender || null,
            body.email || null,
            body.occupation || null,
            body.maritalStatus || null,
            personId,
          ],
        );
      } else {
        // NIK baru — buat person baru
        const personRes = await dbClient.query(
          `INSERT INTO public.person
             (full_name, id_card, passport_number, phone_number, address,
              birth_date, gender, email, occupation, marital_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING person_id`,
          [
            body.fullName,
            nikValue,
            body.passportNumber ? String(body.passportNumber).trim().toUpperCase() : null,
            body.phoneNumber,
            body.address,
            toDate(body.birthDate),
            body.gender,
            body.email,
            body.occupation || null,
            body.maritalStatus || null,
          ],
        );
        personId = personRes.rows[0].person_id;
      }
    } else {
      // Tanpa NIK — selalu buat person baru
      const personRes = await dbClient.query(
        `INSERT INTO public.person
           (full_name, id_card, passport_number, phone_number, address,
            birth_date, gender, email, occupation, marital_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING person_id`,
        [
          body.fullName,
          null,
          body.passportNumber ? String(body.passportNumber).trim().toUpperCase() : null,
          body.phoneNumber,
          body.address,
          toDate(body.birthDate),
          body.gender,
          body.email,
          body.occupation || null,
          body.maritalStatus || null,
        ],
      );
      personId = personRes.rows[0].person_id;
    }

    // ── Tentukan source berdasarkan role ─────────────────────────
    const isAdmin = session.role === "admin_agency" || session.role === "insurance_admin";
    const source = isAdmin ? "ADMIN_ONBOARDED" : "MANUAL";

    // ── Buat client record ───────────────────────────────────────
    const clientRes = await dbClient.query(
      `INSERT INTO public.client
         (agent_id, person_id, status, created_by_user_id, assigned_at, source)
       VALUES ($1, $2, 'ACTIVE', $3, NOW(), $4)
       RETURNING client_id`,
      [userId, personId, userId, source],
    );
    const clientId = clientRes.rows[0].client_id;

    // ── Contract ─────────────────────────────────────────────────
    if (body.policyNumber) {
      const existingContract = await dbClient.query(
        "SELECT contract_id FROM public.contract WHERE contract_number = $1",
        [body.policyNumber],
      );
      if (existingContract.rows.length > 0) {
        await dbClient.query("ROLLBACK");
        return NextResponse.json(
          { error: "Nomor polis sudah terdaftar dalam sistem." },
          { status: 409 },
        );
      }
    }

    const contractRes = await dbClient.query(
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
      ],
    );
    const contractId = contractRes.rows[0].contract_id;

    // ── Contract Detail ──────────────────────────────────────────
    await dbClient.query(
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
      ],
    );

    // ── Beneficiaries ────────────────────────────────────────────
    if (Array.isArray(body.beneficiaries)) {
      for (const b of body.beneficiaries) {
        if (!b?.name) continue;
        await dbClient.query(
          `INSERT INTO public.beneficiary (contract_id, full_name, relationship, percentage, nik)
           VALUES ($1,$2,$3,$4,$5)`,
          [contractId, b.name, b.relationship || "LAINNYA", toNum(b.percentage) ?? 100, b.nik || null],
        );
      }
    }

    // ── Riders ───────────────────────────────────────────────────
    if (Array.isArray(body.riders)) {
      for (const r of body.riders) {
        if (!r?.name) continue;
        await dbClient.query(
          `INSERT INTO public.rider (contract_id, rider_name, coverage)
           VALUES ($1,$2,$3)`,
          [contractId, r.name, toNum(r.coverage)],
        );
      }
    }

    // ── Insured Person (bila berbeda dari pemegang polis) ────────
    if (body.insuredSameAsPolicyholder === false && body.insuredName) {
      await dbClient.query(
        `INSERT INTO public.insured_person (contract_id, full_name, nik, birth_date, gender, relationship)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          contractId,
          body.insuredName,
          body.insuredNIK || null,
          toDate(body.insuredBirthDate),
          body.insuredGender || null,
          body.insuredRelationship || null,
        ],
      );
    }

    // ── Audit log ────────────────────────────────────────────────
    await dbClient.query(
      `INSERT INTO public.client_audit
         (client_id, event_type, to_agent_id, by_user_id, metadata)
       VALUES ($1, 'created', $2, $3, $4)`,
      [
        clientId,
        userId,
        userId,
        JSON.stringify({ source, role: session.role, contract_number: body.policyNumber }),
      ],
    );

    await dbClient.query("COMMIT");
    return NextResponse.json({ success: true, clientId, contractId });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Create client failed", error);
    return NextResponse.json(
      { error: "Gagal membuat data klien. Silakan coba lagi." },
      { status: 500 },
    );
  } finally {
    dbClient.release();
  }
}
