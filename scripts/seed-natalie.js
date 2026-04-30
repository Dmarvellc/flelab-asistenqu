/* eslint-disable */
/**
 * scripts/seed-natalie.js
 * ─────────────────────────────────────────────────────────────────
 * Inject demo data for the agent video tutorial.
 *
 * Target user: natalie@gmail.com
 * Default password (only used if the user doesn't exist yet): demo1234
 *
 * Idempotent: every entity created by this script tags its person.full_name
 * with the prefix "ND-" so re-running is safe. Pass `--force-reset` to wipe
 * Natalie's previously seeded clients/contracts/claims/appointments first.
 *
 * Usage (from repo root):
 *   node scripts/seed-natalie.js
 *   node scripts/seed-natalie.js --force-reset
 *
 *   # override the demo agency match (default ILIKE 'test%'):
 *   SEED_AGENCY_NAME='Exact Agency Name' node scripts/seed-natalie.js
 *
 * Volume produced (medium):
 *   - 12 clients (ACTIVE)
 *   - 12 ACTIVE contracts + 2 PENDING contracts
 *   - 18 claims spread over the last 6 months (mix of DRAFT / SUBMITTED /
 *     APPROVED / REJECTED / COMPLETED / INFO_REQUESTED)
 *   - 10 appointments (6 upcoming + 4 past)
 *   - 6 monthly rows in agent_performance
 *
 * Notes:
 *   - The app uses agent_id == app_user.user_id, so we do too.
 *   - Some tables (doctor, disease, contract_detail, agent.points_balance...)
 *     vary slightly across migrations; those inserts are best-effort and won't
 *     fail the whole run.
 */

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}

const NATALIE_EMAIL = "natalie@gmail.com";
const NATALIE_PASSWORD = "demo1234";
const NATALIE_FULL_NAME = "Natalie Demo";
const NATALIE_PHONE = "+628123450001";
const AGENCY_NAME_PATTERN = process.env.SEED_AGENCY_NAME || "test";
const FORCE_RESET = process.argv.includes("--force-reset");
const PREFIX = "ND-"; // marker on person.full_name so we can find/clean later

// ── helpers ──────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

const CLIENT_NAMES = [
  "Ayu Pratiwi",
  "Budi Santoso",
  "Citra Lestari",
  "Dimas Wibowo",
  "Eka Permata",
  "Fajar Nugroho",
  "Gita Anggraini",
  "Hendra Kurniawan",
  "Indah Maharani",
  "Joko Suryanto",
  "Kirana Putri",
  "Lukman Hakim",
];
const PRODUCTS = [
  "Sehat Premier",
  "Proteksi Plus",
  "Smart Hospital",
  "Family Care",
  "Critical Shield",
];
const HOSPITAL_NAMES = [
  "RS Cipta Medika Jakarta",
  "RS Sehat Sentosa Bandung",
  "RS Mitra Keluarga Surabaya",
];
const DOCTOR_NAMES = [
  "dr. Reza Aditya, Sp.PD",
  "dr. Sari Wulandari, Sp.A",
  "dr. Anton Pratama, Sp.B",
];
const DISEASES = [
  "Demam Berdarah Dengue",
  "Pneumonia",
  "Hipertensi",
  "Apendisitis Akut",
  "Bronkitis",
];

// Claim status/stage mix and weights for the 18 claims.
// status is a Postgres enum: DRAFT / SUBMITTED / APPROVED / REJECTED / PAID / INFO_REQUESTED.
// stage is wider: DRAFT_AGENT / PENDING_LOG / LOG_ISSUED / PENDING_REVIEW / APPROVED / REJECTED / COMPLETED.
const CLAIM_STATUS_MIX = [
  { status: "PAID", stage: "COMPLETED", weight: 4 },
  { status: "APPROVED", stage: "APPROVED", weight: 4 },
  { status: "SUBMITTED", stage: "PENDING_REVIEW", weight: 4 },
  { status: "DRAFT", stage: "DRAFT_AGENT", weight: 3 },
  { status: "REJECTED", stage: "REJECTED", weight: 2 },
  { status: "INFO_REQUESTED", stage: "PENDING_REVIEW", weight: 1 },
];

const APPT_STATUS_MIX_PAST = ["COMPLETED", "COMPLETED", "CANCELLED"];
const APPT_STATUS_MIX_FUTURE = ["SCHEDULED", "CONFIRMED", "SCHEDULED"];

function pickWeighted(arr) {
  const total = arr.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const x of arr) {
    if ((r -= x.weight) <= 0) return x;
  }
  return arr[arr.length - 1];
}

// Run a "best-effort" query inside a SAVEPOINT so its failure can't
// abort the surrounding transaction. Returns null on failure.
let __spCounter = 0;
async function safeQuery(c, sql, params) {
  const sp = "sp_" + ++__spCounter;
  await c.query("SAVEPOINT " + sp);
  try {
    const r = await c.query(sql, params);
    await c.query("RELEASE SAVEPOINT " + sp);
    return r;
  } catch (e) {
    await c.query("ROLLBACK TO SAVEPOINT " + sp);
    return null;
  }
}

// ── main ─────────────────────────────────────────────────────────
async function main() {
  const useSsl =
    DATABASE_URL.includes("supabase.co") ||
    DATABASE_URL.includes("pooler.supabase.com");
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const c = await pool.connect();

  try {
    await c.query("BEGIN");

    const userId = await ensureNatalie(c);
    const agencyId = await attachAgency(c, userId);
    await ensureAuthUser(c, userId);
    await ensurePersonAndAgent(c, userId);

    if (FORCE_RESET) {
      await wipeNatalieSeed(c, userId);
    }

    const alreadySeeded = await isAlreadySeeded(c, userId);
    if (alreadySeeded) {
      console.log(
        "⚠ Natalie already has seed data (clients tagged ND-*). Skipping bulk insert.",
      );
      console.log("  Re-run with --force-reset to regenerate.");
      await c.query("COMMIT");
      return;
    }

    await ensureInsurance(c);
    const hospitalIds = await ensureHospitals(c);
    const doctorIds = await ensureDoctors(c, hospitalIds);
    const diseaseIds = await ensureDiseases(c);

    const clientIds = await seedClients(c, userId);
    const contractIds = await seedContracts(c, clientIds);
    const claimSpec = await seedClaims(
      c,
      userId,
      clientIds,
      contractIds,
      hospitalIds,
      diseaseIds,
    );
    await seedAppointments(c, userId, clientIds, hospitalIds, doctorIds);
    await seedAgentPerformance(c, userId, claimSpec);

    await c.query("COMMIT");
    console.log("\n✅ Demo data ready for", NATALIE_EMAIL);
    console.log(
      "   Login: " +
        NATALIE_EMAIL +
        " / " +
        NATALIE_PASSWORD +
        " (only if newly created — existing password preserved)",
    );
    console.log("   Agency: " + (agencyId || "—"));
  } catch (err) {
    await c.query("ROLLBACK");
    console.error("\n❌ Seed failed, rolled back.");
    console.error(err);
    process.exitCode = 1;
  } finally {
    c.release();
    await pool.end();
  }
}

// ── 1. Ensure Natalie's app_user ─────────────────────────────────
async function ensureNatalie(c) {
  const existing = await c.query(
    "SELECT user_id, status FROM public.app_user WHERE lower(email) = lower($1)",
    [NATALIE_EMAIL],
  );
  if (existing.rows.length > 0) {
    const userId = existing.rows[0].user_id;
    if (existing.rows[0].status !== "ACTIVE") {
      await c.query(
        "UPDATE public.app_user SET status = 'ACTIVE', approved_at = NOW() WHERE user_id = $1",
        [userId],
      );
      console.log("• Activated existing user", NATALIE_EMAIL);
    } else {
      console.log("• Found existing user", NATALIE_EMAIL);
    }
    return userId;
  }

  const passwordHash = await bcrypt.hash(NATALIE_PASSWORD, 10);
  const idRes = await c.query("SELECT gen_random_uuid() AS id");
  const userId = idRes.rows[0].id;

  await c.query(
    `INSERT INTO public.app_user (user_id, email, password_hash, role, status, created_at, approved_at)
     VALUES ($1, $2, $3, 'agent', 'ACTIVE', NOW() - INTERVAL '180 days', NOW() - INTERVAL '180 days')`,
    [userId, NATALIE_EMAIL.toLowerCase(), passwordHash],
  );
  console.log("• Created new agent user", NATALIE_EMAIL);
  return userId;
}

// ── 1b. Ensure auth.users row (FK target for claim.created_by_user_id) ──
// In newer Supabase setups several public.* tables FK to auth.users(id).
// Registration flow no longer writes auth.users (see lib/auth-queries.ts),
// so existing app_user-only accounts like Natalie need a backfilled row.
async function ensureAuthUser(c, userId) {
  const exists = await safeQuery(
    c,
    "SELECT 1 FROM auth.users WHERE id = $1",
    [userId],
  );
  if (exists && exists.rows.length > 0) {
    console.log("• auth.users row already present");
    return;
  }
  // Try shapes from most-detailed to most-minimal. Different Supabase
  // versions have different NOT NULL columns on auth.users.
  const shapes = [
    `INSERT INTO auth.users (
       id, instance_id, aud, role, email, encrypted_password,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
       created_at, updated_at
     ) VALUES (
       $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       $2, '', NOW(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
       NOW(), NOW()
     ) ON CONFLICT (id) DO NOTHING`,
    `INSERT INTO auth.users (id, email, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (id) DO NOTHING`,
    `INSERT INTO auth.users (id, email)
     VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
  ];
  for (const sql of shapes) {
    const ok = await safeQuery(c, sql, [userId, NATALIE_EMAIL.toLowerCase()]);
    if (ok) {
      console.log("• Backfilled auth.users row for Natalie");
      return;
    }
  }
  console.log(
    "⚠ Could not write to auth.users — if claim FK fails, ask DBA to grant write access or relax the FK.",
  );
}

// ── 2. Attach to demo agency ─────────────────────────────────────
async function attachAgency(c, userId) {
  const ag = await c.query(
    "SELECT agency_id, name FROM public.agency WHERE name ILIKE $1 ORDER BY created_at LIMIT 1",
    [AGENCY_NAME_PATTERN + "%"],
  );
  if (ag.rows.length === 0) {
    console.log(
      `⚠ No agency matching '${AGENCY_NAME_PATTERN}%' — skipping agency assignment`,
    );
    return null;
  }
  const { agency_id, name } = ag.rows[0];
  await c.query(
    "UPDATE public.app_user SET agency_id = $1 WHERE user_id = $2",
    [agency_id, userId],
  );
  console.log("• Attached to agency", name, `(${agency_id})`);
  return agency_id;
}

// ── 3. Ensure person + agent rows ────────────────────────────────
async function ensurePersonAndAgent(c, userId) {
  const link = await c.query(
    "SELECT person_id FROM public.user_person_link WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  let personId;
  if (link.rows.length > 0) {
    personId = link.rows[0].person_id;
  } else {
    const p = await c.query(
      `INSERT INTO public.person (full_name, phone_number)
       VALUES ($1, $2) RETURNING person_id`,
      [NATALIE_FULL_NAME, NATALIE_PHONE],
    );
    personId = p.rows[0].person_id;
    // Some schemas don't have relation_type — try with, then without.
    let linked = await safeQuery(
      c,
      `INSERT INTO public.user_person_link (user_id, person_id, relation_type)
       VALUES ($1, $2, 'OWNER')
       ON CONFLICT DO NOTHING`,
      [userId, personId],
    );
    if (!linked) {
      await safeQuery(
        c,
        `INSERT INTO public.user_person_link (user_id, person_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, personId],
      );
    }
  }

  const insRes = await c.query("SELECT insurance_id FROM public.insurance LIMIT 1");
  let insuranceId;
  if (insRes.rows.length > 0) {
    insuranceId = insRes.rows[0].insurance_id;
  } else {
    const ins = await c.query(
      "INSERT INTO public.insurance (insurance_name) VALUES ('Demo Insurance') RETURNING insurance_id",
    );
    insuranceId = ins.rows[0].insurance_id;
  }

  const agentRes = await c.query(
    "SELECT agent_id FROM public.agent WHERE agent_id = $1",
    [userId],
  );
  if (agentRes.rows.length === 0) {
    const inserted = await safeQuery(
      c,
      `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status, person_id)
       VALUES ($1, $2, $3, 'ACTIVE', $4)`,
      [userId, NATALIE_FULL_NAME, insuranceId, personId],
    );
    if (!inserted) {
      await safeQuery(
        c,
        `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status)
         VALUES ($1, $2, $3, 'ACTIVE')`,
        [userId, NATALIE_FULL_NAME, insuranceId],
      );
    }
  } else {
    await safeQuery(
      c,
      "UPDATE public.agent SET status = 'ACTIVE' WHERE agent_id = $1",
      [userId],
    );
  }

  // Best-effort points/wallet — column names vary across migrations.
  await safeQuery(
    c,
    "UPDATE public.agent SET points_balance = 2400 WHERE agent_id = $1",
    [userId],
  );
  await safeQuery(
    c,
    "UPDATE public.agent SET wallet_balance = 250000 WHERE agent_id = $1",
    [userId],
  );
}

// ── helpers for idempotency ─────────────────────────────────────
async function isAlreadySeeded(c, userId) {
  const r = await c.query(
    `SELECT 1
       FROM public.client cl
       JOIN public.person p ON p.person_id = cl.person_id
      WHERE cl.agent_id = $1 AND p.full_name LIKE $2
      LIMIT 1`,
    [userId, PREFIX + "%"],
  );
  return r.rowCount > 0;
}

async function wipeNatalieSeed(c, userId) {
  console.log("• --force-reset: wiping Natalie's previous seed");
  const ids = await c.query(
    `SELECT cl.client_id, cl.person_id
       FROM public.client cl
       JOIN public.person p ON p.person_id = cl.person_id
      WHERE cl.agent_id = $1 AND p.full_name LIKE $2`,
    [userId, PREFIX + "%"],
  );
  const clientIds = ids.rows.map((r) => r.client_id);
  const personIds = ids.rows.map((r) => r.person_id);
  if (clientIds.length === 0) {
    console.log("  (nothing to wipe)");
    return;
  }
  await c.query("DELETE FROM public.appointment WHERE client_id = ANY($1::uuid[])", [
    clientIds,
  ]);
  await c.query("DELETE FROM public.claim WHERE client_id = ANY($1::uuid[])", [
    clientIds,
  ]);
  await safeQuery(
    c,
    `DELETE FROM public.contract_detail
     WHERE contract_id IN (SELECT contract_id FROM public.contract WHERE client_id = ANY($1::uuid[]))`,
    [clientIds],
  );
  await c.query("DELETE FROM public.contract WHERE client_id = ANY($1::uuid[])", [
    clientIds,
  ]);
  await c.query("DELETE FROM public.client WHERE client_id = ANY($1::uuid[])", [
    clientIds,
  ]);
  await c.query("DELETE FROM public.person WHERE person_id = ANY($1::uuid[])", [
    personIds,
  ]);
  await c.query("DELETE FROM public.agent_performance WHERE agent_user_id = $1", [
    userId,
  ]);
  console.log(`  wiped ${clientIds.length} clients & related rows`);
}

// ── 4. Reference data (best-effort) ──────────────────────────────
async function ensureInsurance(c) {
  const r = await c.query("SELECT insurance_id FROM public.insurance LIMIT 1");
  if (r.rows.length > 0) return r.rows[0].insurance_id;
  const i = await c.query(
    "INSERT INTO public.insurance (insurance_name) VALUES ('Demo Insurance') RETURNING insurance_id",
  );
  return i.rows[0].insurance_id;
}

async function ensureHospitals(c) {
  const existing = await c.query(
    "SELECT hospital_id FROM public.hospital ORDER BY created_at LIMIT 3",
  );
  const ids = existing.rows.map((r) => r.hospital_id);
  for (const name of HOSPITAL_NAMES) {
    if (ids.length >= 3) break;
    const ins = await safeQuery(
      c,
      `INSERT INTO public.hospital (name, address, is_partner, status)
       VALUES ($1, $2, true, 'ACTIVE') RETURNING hospital_id`,
      [name, "Jakarta"],
    );
    if (ins) ids.push(ins.rows[0].hospital_id);
  }
  return ids;
}

async function ensureDoctors(c, hospitalIds) {
  const existing = await safeQuery(
    c,
    "SELECT doctor_id FROM public.doctor ORDER BY created_at LIMIT 3",
  );
  const ids = existing ? existing.rows.map((r) => r.doctor_id) : [];
  if (ids.length >= 3) return ids;
  for (let i = 0; ids.length < 3 && i < DOCTOR_NAMES.length; i++) {
    const ins = await safeQuery(
      c,
      `INSERT INTO public.doctor (doctor_name, specialty, hospital_id, status)
       VALUES ($1, $2, $3, 'ACTIVE') RETURNING doctor_id`,
      [DOCTOR_NAMES[i], "Internis", hospitalIds[i % hospitalIds.length]],
    );
    if (ins) ids.push(ins.rows[0].doctor_id);
  }
  return ids;
}

async function ensureDiseases(c) {
  const r = await safeQuery(
    c,
    "SELECT disease_id FROM public.disease ORDER BY disease_name LIMIT 5",
  );
  const ids = r ? r.rows.map((x) => x.disease_id) : [];
  if (ids.length >= 3) return ids;
  for (const d of DISEASES) {
    if (ids.length >= 5) break;
    const ins = await safeQuery(
      c,
      "INSERT INTO public.disease (disease_name) VALUES ($1) RETURNING disease_id",
      [d],
    );
    if (ins) ids.push(ins.rows[0].disease_id);
  }
  return ids;
}

// ── 5. Seed clients ──────────────────────────────────────────────
async function seedClients(c, userId) {
  const clientIds = [];
  for (let i = 0; i < CLIENT_NAMES.length; i++) {
    const fullName = `${PREFIX}${CLIENT_NAMES[i]}`;
    const phone = `+628123${String(900 + i).padStart(3, "0")}${rand(100, 999)}`;
    const createdDaysAgo = rand(7, 170);
    const p = await c.query(
      `INSERT INTO public.person (full_name, phone_number, address, gender, email, occupation)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING person_id`,
      [
        fullName,
        phone,
        `Jl. Demo No. ${i + 1}, Jakarta`,
        i % 2 === 0 ? "F" : "M",
        `client${i + 1}.natalie@example.com`,
        pick(["Karyawan Swasta", "Wiraswasta", "PNS", "Profesional"]),
      ],
    );
    const personId = p.rows[0].person_id;
    const cl = await c.query(
      `INSERT INTO public.client (agent_id, person_id, status, created_at)
       VALUES ($1, $2, 'ACTIVE', NOW() - ($3 || ' days')::interval)
       RETURNING client_id`,
      [userId, personId, createdDaysAgo],
    );
    clientIds.push(cl.rows[0].client_id);
  }
  console.log(`• Seeded ${clientIds.length} clients`);
  return clientIds;
}

// ── 6. Seed contracts ────────────────────────────────────────────
async function seedContracts(c, clientIds) {
  const contractIds = [];
  for (let i = 0; i < clientIds.length; i++) {
    const isPending = i < 2;
    const startDays = rand(30, 180);
    const product = pick(PRODUCTS);
    const policyNumber = `POL-ND-${Date.now().toString().slice(-6)}-${i + 1}`;
    const cr = await c.query(
      `INSERT INTO public.contract (
         client_id, contract_number, contract_product,
         contract_startdate, contract_duedate, status,
         insurance_company_name, policy_status, currency,
         issue_date, next_due_date, due_day,
         grace_period_days, reinstatement_period,
         policy_term_years, premium_payment_term
       ) VALUES (
         $1, $2, $3,
         (NOW() - ($4 || ' days')::interval)::date,
         (NOW() + INTERVAL '365 days')::date, 'ACTIVE',
         'PT Asuransi Demo', 'AKTIF', 'IDR',
         (NOW() - ($4 || ' days')::interval)::date,
         (NOW() + INTERVAL '30 days')::date, 1,
         30, 24, 5, 5
       ) RETURNING contract_id`,
      [clientIds[i], policyNumber, product, startDays],
    );
    const contractId = cr.rows[0].contract_id;
    contractIds.push(contractId);

    const sumInsured = rand(50, 500) * 1_000_000;
    const premium = rand(500, 3500) * 1000;
    await safeQuery(
      c,
      `INSERT INTO public.contract_detail (
         contract_id, sum_insured, payment_type, premium_amount,
         premium_frequency, coverage_area
       ) VALUES ($1, $2, 'MONTHLY', $3, 'MONTHLY', 'INDONESIA')`,
      [contractId, sumInsured, premium],
    );

    if (isPending) {
      const pendingNumber = `POL-ND-${Date.now().toString().slice(-6)}-${i + 1}P`;
      await safeQuery(
        c,
        `INSERT INTO public.contract (
           client_id, contract_number, contract_product,
           contract_startdate, contract_duedate, status,
           insurance_company_name, policy_status, currency
         ) VALUES (
           $1, $2, $3,
           (NOW() - INTERVAL '5 days')::date,
           (NOW() + INTERVAL '360 days')::date,
           'PENDING', 'PT Asuransi Demo', 'PENGAJUAN', 'IDR'
         )`,
        [clientIds[i], pendingNumber, pick(PRODUCTS)],
      );
    }
  }
  console.log(`• Seeded ${contractIds.length} ACTIVE contracts (+2 PENDING)`);
  return contractIds;
}

// ── 7. Seed claims ──────────────────────────────────────────────
async function seedClaims(c, userId, clientIds, contractIds, hospitalIds, diseaseIds) {
  const out = [];
  const total = 18;
  for (let i = 0; i < total; i++) {
    const sel = pickWeighted(CLAIM_STATUS_MIX);
    const monthsBack = i % 6;
    const created = new Date();
    created.setDate(1);
    created.setMonth(created.getMonth() - monthsBack);
    created.setDate(rand(2, 27));
    created.setHours(rand(8, 20), rand(0, 59));

    const ci = i % clientIds.length;
    const personRes = await c.query(
      "SELECT person_id FROM public.client WHERE client_id = $1",
      [clientIds[ci]],
    );
    const personId = personRes.rows[0].person_id;
    const total_amount = rand(2_000_000, 35_000_000);

    await c.query(
      `INSERT INTO public.claim (
         client_id, person_id, contract_id, hospital_id, disease_id,
         claim_date, total_amount, notes,
         assigned_agent_id, created_by_user_id, status, stage,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $12)`,
      [
        clientIds[ci],
        personId,
        contractIds[ci],
        hospitalIds[i % hospitalIds.length],
        diseaseIds[i % Math.max(1, diseaseIds.length)] || null,
        created,
        total_amount,
        `${PREFIX}auto-seeded claim`,
        userId,
        sel.status,
        sel.stage,
        created,
      ],
    );
    out.push({ status: sel.status, createdAt: created, amount: total_amount });
  }
  console.log(`• Seeded ${total} claims (mixed statuses across last 6 months)`);
  return out;
}

// ── 8. Seed appointments ─────────────────────────────────────────
async function seedAppointments(c, userId, clientIds, hospitalIds, doctorIds) {
  const total = 10;
  for (let i = 0; i < total; i++) {
    const isFuture = i < 6;
    const offsetDays = isFuture ? rand(1, 21) : -rand(1, 90);
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const time = `${String(rand(8, 17)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`;
    const status = pick(isFuture ? APPT_STATUS_MIX_FUTURE : APPT_STATUS_MIX_PAST);
    const apptType = pick([
      "CONSULTATION",
      "FOLLOW_UP",
      "PROCEDURE",
      "PRE_HOSPITALIZATION",
    ]);
    const ci = i % clientIds.length;

    await c.query(
      `INSERT INTO public.appointment (
         client_id, hospital_id, doctor_id, agent_user_id,
         appointment_date, appointment_time, appointment_type, status, notes,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9,
                 NOW() - ($10 || ' days')::interval,
                 NOW() - ($11 || ' days')::interval)`,
      [
        clientIds[ci],
        hospitalIds[i % hospitalIds.length],
        doctorIds[i % Math.max(1, doctorIds.length)] || null,
        userId,
        date.toISOString().slice(0, 10),
        time,
        apptType,
        status,
        `${PREFIX}follow-up ${apptType.toLowerCase()}`,
        rand(1, 30),
        rand(0, 5),
      ],
    );
  }
  console.log(`• Seeded ${total} appointments (6 upcoming + 4 past)`);
}

// ── 9. Seed agent_performance for the last 6 months ──────────────
async function seedAgentPerformance(c, userId, claims) {
  const now = new Date();
  for (let m = 0; m < 6; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const monthClaims = claims.filter(
      (cl) =>
        cl.createdAt.getFullYear() === year && cl.createdAt.getMonth() + 1 === month,
    );
    const total = monthClaims.length;
    const approved = monthClaims.filter(
      (cl) => cl.status === "APPROVED" || cl.status === "PAID",
    ).length;
    const rejected = monthClaims.filter((cl) => cl.status === "REJECTED").length;
    const totalValue = monthClaims.reduce((s, cl) => s + cl.amount, 0);
    const commission = Math.round(totalValue * 0.05);
    const points = approved * 50 + (total - approved - rejected) * 10;
    const rank =
      points >= 200 ? "GOLD" : points >= 100 ? "SILVER" : "BRONZE";

    await c.query(
      `INSERT INTO public.agent_performance (
         agent_user_id, period_year, period_month,
         total_claims, approved_claims, rejected_claims,
         total_claim_value, total_commission, points_earned, rank_level
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (agent_user_id, period_year, period_month)
       DO UPDATE SET
         total_claims = EXCLUDED.total_claims,
         approved_claims = EXCLUDED.approved_claims,
         rejected_claims = EXCLUDED.rejected_claims,
         total_claim_value = EXCLUDED.total_claim_value,
         total_commission = EXCLUDED.total_commission,
         points_earned = EXCLUDED.points_earned,
         rank_level = EXCLUDED.rank_level,
         updated_at = NOW()`,
      [
        userId,
        year,
        month,
        total,
        approved,
        rejected,
        totalValue,
        commission,
        points,
        rank,
      ],
    );
  }
  console.log("• Upserted 6 monthly agent_performance rows");
}

main();
