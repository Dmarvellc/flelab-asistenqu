#!/usr/bin/env node
/**
 * Load Indonesia wilayah from idn-area-data (bundled CSV) into Postgres.
 *
 * Prerequisites: migration_v14 applied (pnpm db:migrate)
 * Usage:           pnpm db:seed-wilayah
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from "idn-area-data";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL not set (.env.local)");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("sslmode=require") || DATABASE_URL.includes("supabase.co")
      ? { rejectUnauthorized: false }
      : undefined,
  max: 4,
});

async function unnestBatch(client, sql, cols, rows, batchSize = 2500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const arrs = cols.map((_, ci) => slice.map((r) => r[ci]));
    const placeholders = cols.map((_, j) => `$${j + 1}::text[]`).join(", ");
    await client.query(`${sql} SELECT * FROM unnest(${placeholders})`, arrs);
  }
}

async function main() {
  console.log("Downloading / parsing wilayah from idn-area-data…");
  const [provinces, regencies, districts, villages] = await Promise.all([
    getProvinces(),
    getRegencies(),
    getDistricts(),
    getVillages(),
  ]);

  console.log(
    `  provinces=${provinces.length} regencies=${regencies.length} districts=${districts.length} villages=${villages.length}`
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "TRUNCATE TABLE public.idn_village, public.idn_district, public.idn_regency, public.idn_province CASCADE"
    );

    await unnestBatch(
      client,
      `INSERT INTO public.idn_province (code, name)`,
      ["code", "name"],
      provinces.map((p) => [p.code, p.name]),
      provinces.length
    );

    await unnestBatch(
      client,
      `INSERT INTO public.idn_regency (code, province_code, name)`,
      ["code", "province_code", "name"],
      regencies.map((r) => [r.code, r.province_code, r.name])
    );

    await unnestBatch(
      client,
      `INSERT INTO public.idn_district (code, regency_code, name)`,
      ["code", "regency_code", "name"],
      districts.map((d) => [d.code, d.regency_code, d.name])
    );

    await unnestBatch(
      client,
      `INSERT INTO public.idn_village (code, district_code, name)`,
      ["code", "district_code", "name"],
      villages.map((v) => [v.code, v.district_code, v.name])
    );

    await client.query("COMMIT");
    console.log("✅ idn wilayah seed complete.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", e.message || e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
