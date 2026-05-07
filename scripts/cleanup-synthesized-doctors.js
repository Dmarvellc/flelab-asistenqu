/* eslint-disable */
/**
 * scripts/cleanup-synthesized-doctors.js
 * ─────────────────────────────────────────────────────────────────
 * Remove any doctors that were programmatically synthesised by previous
 * runs of seed-malaysia.js / seed-indonesia.js.
 *
 * Detection: synthesised rows are the only ones whose photo_url contains
 * "dicebear" / "robohash" / "ui-avatars". The hand-curated NAMED_DOCTORS
 * are inserted with photo_url = NULL, so they're safe.
 *
 * Cascading deletes via FK take care of doctor_hospital, doctor_schedule,
 * and the corresponding public.doctor (claims) row when matched by name.
 *
 * Usage:
 *   node scripts/cleanup-synthesized-doctors.js          # dry run
 *   node scripts/cleanup-synthesized-doctors.js --apply  # actually delete
 */

const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FAKE_PATTERN = "(photo_url ILIKE '%dicebear%' OR photo_url ILIKE '%robohash%' OR photo_url ILIKE '%ui-avatars%' OR photo_url ILIKE '%gravatar%')";

async function main() {
  const c = await pool.connect();
  try {
    const preview = await c.query(
      `SELECT id, name, specialization, hospital, country FROM public.doctors WHERE ${FAKE_PATTERN} ORDER BY country, name`
    );
    console.log(`Found ${preview.rowCount} synthesised doctor row(s).`);
    if (preview.rowCount > 0) {
      console.log("Examples:");
      preview.rows.slice(0, 8).forEach((r) => console.log(`  · ${r.name} — ${r.specialization} @ ${r.hospital} (${r.country})`));
      if (preview.rowCount > 8) console.log(`  · …and ${preview.rowCount - 8} more`);
    }

    if (!apply) {
      console.log("\nDry run. Re-run with --apply to actually delete.");
      return;
    }

    await c.query("BEGIN");
    // Delete claim-side rows by name match (no FK from doctors→doctor in this schema)
    const claimRes = await c.query(
      `DELETE FROM public.doctor WHERE lower(full_name) IN (SELECT lower(name) FROM public.doctors WHERE ${FAKE_PATTERN})`
    );
    // Cascading delete from public.doctors will clean doctor_hospital + doctor_schedule via FK.
    const docRes = await c.query(`DELETE FROM public.doctors WHERE ${FAKE_PATTERN}`);
    await c.query("COMMIT");

    console.log(`\n✅  Removed ${docRes.rowCount} marketplace doctor(s) and ${claimRes.rowCount} claim-side row(s).`);
  } catch (e) {
    await c.query("ROLLBACK");
    console.error("Cleanup failed:", e.message);
    process.exitCode = 1;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
