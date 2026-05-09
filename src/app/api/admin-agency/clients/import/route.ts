import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureAgentRecord } from "@/lib/storage";

// ── Kolom CSV yang didukung ──────────────────────────────────────────────────
// Wajib: full_name
// Opsional: nik, phone, email, address, birth_date (YYYY-MM-DD), gender (L/P),
//           policy_number, product_name, insurance_company, start_date, end_date,
//           premium_amount, agent_email
// Jika agent_email kosong → client jadi UNASSIGNED (agent_id NULL)

type CsvRow = Record<string, string>;

const COLUMN_ALIASES: Record<string, string> = {
  nama: "full_name",
  nama_lengkap: "full_name",
  name: "full_name",
  full_name: "full_name",
  nik: "nik",
  ktp: "nik",
  no_ktp: "nik",
  telepon: "phone",
  telp: "phone",
  no_telp: "phone",
  phone: "phone",
  phone_number: "phone",
  email: "email",
  alamat: "address",
  address: "address",
  tanggal_lahir: "birth_date",
  tgl_lahir: "birth_date",
  birth_date: "birth_date",
  jenis_kelamin: "gender",
  gender: "gender",
  no_polis: "policy_number",
  nomor_polis: "policy_number",
  policy_number: "policy_number",
  produk: "product_name",
  product: "product_name",
  product_name: "product_name",
  perusahaan_asuransi: "insurance_company",
  asuransi: "insurance_company",
  insurance_company: "insurance_company",
  tanggal_mulai: "start_date",
  start_date: "start_date",
  tanggal_berakhir: "end_date",
  end_date: "end_date",
  premi: "premium_amount",
  premium_amount: "premium_amount",
  email_agen: "agent_email",
  agent_email: "agent_email",
};

function parseCSV(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  // Parse header — normalize ke snake_case lowercase, strip BOM
  const rawHeaders = lines[0]
    .replace(/^﻿/, "") // strip UTF-8 BOM
    .split(",")
    .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase().replace(/\s+/g, "_"));

  const headers = rawHeaders.map((h) => COLUMN_ALIASES[h] ?? h);

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split — handles quoted fields with commas
    const values: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    values.push(cur.trim());

    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function normalizeGender(v: string): string | null {
  const up = v.toUpperCase();
  if (up === "L" || up === "LAKI" || up === "LAKI-LAKI" || up === "M" || up === "MALE") return "L";
  if (up === "P" || up === "PEREMPUAN" || up === "F" || up === "FEMALE" || up === "W" || up === "WANITA") return "P";
  return null;
}

function normalizeDate(v: string): string | null {
  if (!v) return null;
  // Terima format: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return v;
  const dmy = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

function normalizePhone(v: string): string | null {
  if (!v) return null;
  let p = v.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (p.startsWith("0")) p = `+62${p.slice(1)}`;
  if (p.startsWith("62") && !p.startsWith("+")) p = `+${p}`;
  return p || null;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminRoles = ["admin_agency", "insurance_admin", "super_admin"];
  if (!adminRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agencyId = session.agencyId;
  if (!agencyId && session.role !== "super_admin") {
    return NextResponse.json({ error: "Akun tidak terhubung ke agensi" }, { status: 403 });
  }

  let csvText: string;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File CSV diperlukan" }, { status: 400 });
    }
    csvText = await (file as File).text();
  } catch {
    return NextResponse.json({ error: "Gagal membaca file" }, { status: 400 });
  }

  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "File CSV kosong atau format tidak valid" }, { status: 400 });
  }
  if (rows.length > 15_000) {
    return NextResponse.json({ error: "Maksimal 15.000 baris per upload" }, { status: 400 });
  }

  // ── Cache agent email → user_id di agency ini ────────────────
  const agentEmailMap = new Map<string, string>();
  if (agencyId) {
    const dbClient = await dbPool.connect();
    try {
      const agentRes = await dbClient.query(
        `SELECT u.user_id, u.email
         FROM public.app_user u
         WHERE u.agency_id = $1 AND u.role IN ('agent','agent_manager','admin_agency')`,
        [agencyId],
      );
      for (const r of agentRes.rows) {
        agentEmailMap.set(r.email.toLowerCase(), r.user_id);
      }

      // Pastikan caller punya agent record (kalau mereka mau assign ke diri sendiri)
      const callerPersonRes = await dbClient.query(
        `SELECT p.full_name FROM public.user_person_link upl
         JOIN public.person p ON upl.person_id = p.person_id
         WHERE upl.user_id = $1`,
        [session.userId],
      );
      const callerName = callerPersonRes.rows[0]?.full_name ?? "Admin";
      await ensureAgentRecord(dbClient, session.userId, callerName);
    } finally {
      dbClient.release();
    }
  }

  // ── Proses baris per baris dalam satu transaksi ─────────────
  const results = {
    total: rows.length,
    success: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; reason: string; data: CsvRow }>,
  };

  const BATCH_SIZE = 500;
  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const dbClient = await dbPool.connect();

    try {
      await dbClient.query("BEGIN");

      for (let i = 0; i < batch.length; i++) {
        const rowNum = batchStart + i + 2; // +2 karena header di baris 1
        const row = batch[i];

        if (!row.full_name) {
          results.errors.push({ row: rowNum, reason: "Nama tidak boleh kosong", data: row });
          continue;
        }

        // ── Resolve agent ───────────────────────────────────────
        let agentId: string | null = null;
        if (row.agent_email) {
          const found = agentEmailMap.get(row.agent_email.toLowerCase());
          if (!found) {
            results.errors.push({
              row: rowNum,
              reason: `Email agen '${row.agent_email}' tidak ditemukan di agensi`,
              data: row,
            });
            continue;
          }
          agentId = found;
        }
        // Jika agent_email kosong → agentId = null (UNASSIGNED, di-assign nanti)

        // ── Deduplication NIK ───────────────────────────────────
        let personId: string;
        const nik = row.nik ? row.nik.replace(/\D/g, "") : null;

        if (nik) {
          const existPerson = await dbClient.query(
            "SELECT person_id FROM public.person WHERE id_card = $1 LIMIT 1",
            [nik],
          );

          if (existPerson.rows.length > 0) {
            personId = existPerson.rows[0].person_id;

            // Cek duplikat klien di agency
            const existClient = await dbClient.query(
              `SELECT c.client_id FROM public.client c
               LEFT JOIN public.app_user u ON c.agent_id = u.user_id
               WHERE c.person_id = $1
                 AND (u.agency_id = $2 OR c.created_by_user_id IN (
                   SELECT user_id FROM public.app_user WHERE agency_id = $2
                 ))
               LIMIT 1`,
              [personId, agencyId],
            );

            if (existClient.rows.length > 0) {
              results.skipped++;
              continue; // Skip — sudah ada, bukan error
            }
          } else {
            const pr = await dbClient.query(
              `INSERT INTO public.person
                 (full_name, id_card, phone_number, address, birth_date, gender, email)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               RETURNING person_id`,
              [
                row.full_name,
                nik,
                normalizePhone(row.phone),
                row.address || null,
                normalizeDate(row.birth_date),
                normalizeGender(row.gender),
                row.email || null,
              ],
            );
            personId = pr.rows[0].person_id;
          }
        } else {
          const pr = await dbClient.query(
            `INSERT INTO public.person
               (full_name, phone_number, address, birth_date, gender, email)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING person_id`,
            [
              row.full_name,
              normalizePhone(row.phone),
              row.address || null,
              normalizeDate(row.birth_date),
              normalizeGender(row.gender),
              row.email || null,
            ],
          );
          personId = pr.rows[0].person_id;
        }

        // ── Buat client ─────────────────────────────────────────
        const clientRes = await dbClient.query(
          `INSERT INTO public.client
             (agent_id, person_id, status, created_by_user_id, assigned_at, source)
           VALUES ($1, $2, 'ACTIVE', $3, $4, 'IMPORTED')
           RETURNING client_id`,
          [
            agentId,
            personId,
            session.userId,
            agentId ? new Date().toISOString() : null,
          ],
        );
        const clientId = clientRes.rows[0].client_id;

        // ── Buat contract jika ada data polis ──────────────────
        if (row.policy_number || row.product_name) {
          // Cek duplikat nomor polis
          if (row.policy_number) {
            const existContract = await dbClient.query(
              "SELECT contract_id FROM public.contract WHERE contract_number = $1",
              [row.policy_number],
            );
            if (existContract.rows.length > 0) {
              // Klien berhasil dibuat tapi polis skip
              results.success++;
              await dbClient.query(
                `INSERT INTO public.client_audit
                   (client_id, event_type, to_agent_id, by_user_id, metadata)
                 VALUES ($1,'bulk_imported',$2,$3,$4)`,
                [clientId, agentId, session.userId, JSON.stringify({ row: rowNum, note: "duplicate_policy_skipped" })],
              );
              continue;
            }
          }

          const premiumAmount = parseFloat(row.premium_amount) || 0;
          const cRes = await dbClient.query(
            `INSERT INTO public.contract
               (client_id, contract_number, contract_product,
                contract_startdate, contract_duedate, status,
                insurance_company_name)
             VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6)
             RETURNING contract_id`,
            [
              clientId,
              row.policy_number || `IMP-${Date.now()}-${i}`,
              row.product_name || null,
              normalizeDate(row.start_date),
              normalizeDate(row.end_date),
              row.insurance_company || null,
            ],
          );
          const contractId = cRes.rows[0].contract_id;

          await dbClient.query(
            `INSERT INTO public.contract_detail
               (contract_id, premium_amount, payment_type, premium_frequency)
             VALUES ($1,$2,'MONTHLY','MONTHLY')`,
            [contractId, premiumAmount],
          );
        }

        // ── Audit log ───────────────────────────────────────────
        await dbClient.query(
          `INSERT INTO public.client_audit
             (client_id, event_type, to_agent_id, by_user_id, metadata)
           VALUES ($1,'bulk_imported',$2,$3,$4)`,
          [
            clientId,
            agentId,
            session.userId,
            JSON.stringify({ row: rowNum, source: "csv_import" }),
          ],
        );

        results.success++;
      }

      await dbClient.query("COMMIT");
    } catch (err) {
      await dbClient.query("ROLLBACK");
      console.error(`Batch ${batchStart}–${batchStart + BATCH_SIZE} gagal:`, err);
      // Tandai seluruh batch sebagai error agar tidak hilang
      for (let i = 0; i < batch.length; i++) {
        results.errors.push({
          row: batchStart + i + 2,
          reason: "Batch gagal diproses, coba upload ulang baris ini",
          data: batch[i],
        });
      }
    } finally {
      dbClient.release();
    }
  }

  return NextResponse.json({
    success: true,
    summary: {
      total: results.total,
      imported: results.success,
      skipped: results.skipped,
      errors: results.errors.length,
    },
    errors: results.errors.slice(0, 100), // Kirim max 100 error ke client
  });
}
