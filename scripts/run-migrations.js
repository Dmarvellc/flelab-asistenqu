#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Database migration runner for `db/migration_v*.sql`.
 *
 * Usage:
 *   node scripts/run-migrations.js
 *   node scripts/run-migrations.js all
 *   node scripts/run-migrations.js v10
 *   node scripts/run-migrations.js status
 *   node scripts/run-migrations.js v8 --force
 *
 * Notes:
 * - All files under `db/migration_v*.sql` are discovered automatically and
 *   run in ascending version order.
 * - `migration_v8_performance_indexes.sql` is executed statement-by-statement
 *   outside a transaction because it uses `CREATE INDEX CONCURRENTLY`.
 * - Successful runs are recorded in `public.schema_migration_history`.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function pathJoin(...parts) {
  return path.join(__dirname, "..", ...parts);
}

require("dotenv").config({ path: pathJoin(".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL not set in .env.local");
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

const DB_DIR = pathJoin("db");
const NON_TRANSACTIONAL_FILES = new Set([
  "migration_v8_performance_indexes.sql",
  "migration_v12_dashboard_perf_indexes.sql",
]);

function readSql(file) {
  return fs.readFileSync(path.join(DB_DIR, file), "utf8");
}

function extractVersion(file) {
  const match = file.match(/migration_v(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function listMigrationFiles() {
  return fs
    .readdirSync(DB_DIR)
    .filter((file) => /^migration_v\d+.*\.sql$/i.test(file))
    .sort((a, b) => extractVersion(a) - extractVersion(b) || a.localeCompare(b));
}

function normalizeTarget(arg) {
  return (arg || "all").toLowerCase();
}

function fileMatchesTarget(file, target) {
  if (target === "all") return true;
  if (target === "status") return false;
  const version = `v${extractVersion(file)}`;
  return file.toLowerCase() === target || version === target;
}

/** Split SQL into top-level statements, respecting $$-quoted blocks. */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let inDollar = false;
  let dollarTag = "";
  const lines = sql.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/--.*$/, "");
    let i = 0;
    while (i < line.length) {
      if (!inDollar) {
        const match = line.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
        if (match) {
          inDollar = true;
          dollarTag = match[0];
          buf += dollarTag;
          i += dollarTag.length;
          continue;
        }
        if (line[i] === ";") {
          buf += ";";
          const stmt = buf.trim();
          if (stmt && stmt !== ";") out.push(stmt);
          buf = "";
          i++;
          continue;
        }
      } else if (line.slice(i).startsWith(dollarTag)) {
        inDollar = false;
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }

      buf += line[i];
      i++;
    }
    buf += "\n";
  }
  const tail = buf.trim();
  if (tail && tail !== ";") out.push(tail);
  return out;
}

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migration_history (
      filename    text PRIMARY KEY,
      version     integer NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMap() {
  await ensureMigrationTable();
  const res = await pool.query(`
    SELECT filename, version, applied_at
    FROM public.schema_migration_history
    ORDER BY version ASC, filename ASC
  `);

  return new Map(res.rows.map((row) => [row.filename, row]));
}

async function markApplied(file) {
  await pool.query(
    `
      INSERT INTO public.schema_migration_history (filename, version, applied_at)
      VALUES ($1, $2, now())
      ON CONFLICT (filename)
      DO UPDATE SET version = EXCLUDED.version, applied_at = EXCLUDED.applied_at
    `,
    [file, extractVersion(file)]
  );
}

async function runTransactionalFile(file) {
  const sql = readSql(file);
  const client = await pool.connect();
  try {
    const hasExplicitBegin = /^\s*BEGIN\s*;/im.test(sql);
    if (!hasExplicitBegin) await client.query("BEGIN");
    await client.query(sql);
    if (!hasExplicitBegin) await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function runConcurrentFile(file) {
  const sql = readSql(file);
  const statements = splitStatements(sql);
  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
    try {
      await pool.query(stmt);
      ok++;
      console.log(`  ✓ ${preview}${stmt.length > 90 ? "…" : ""}`);
    } catch (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("already exists")) {
        skipped++;
        console.log(`  • skipped (exists): ${preview.slice(0, 70)}`);
      } else if (message.includes("does not exist") && message.includes("relation")) {
        skipped++;
        console.warn(`  ⚠ skipped (table missing): ${preview.slice(0, 70)}`);
      } else {
        failed++;
        console.error(`  ✗ ${preview}\n    ${error.message}`);
      }
    }
  }

  console.log(`\n  ${file} summary: ${ok} created, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) throw new Error(`${file}: one or more statements failed`);
}

async function analyzeCoreTables() {
  console.log("\n▶ ANALYZE (update planner stats)");
  const tables = [
    "public.claim",
    "public.client",
    "public.contract",
    "public.contract_detail",
    "public.person",
    "public.app_user",
    "public.user_role",
    "public.claim_document",
    "public.claim_info_request",
    "public.claim_timeline",
    "public.auth_session",
  ];

  for (const table of tables) {
    try {
      await pool.query(`ANALYZE ${table}`);
      console.log(`  ✓ ANALYZE ${table}`);
    } catch (error) {
      console.warn(`  ⚠ ANALYZE ${table} failed: ${error.message}`);
    }
  }
}

async function runFile(file, force, appliedMap) {
  const alreadyApplied = appliedMap.has(file);
  if (alreadyApplied && !force) {
    console.log(`\n• skip ${file} (already recorded)`);
    return "skipped";
  }

  const label = NON_TRANSACTIONAL_FILES.has(file)
    ? `${file} (non-transactional)`
    : `${file} (transactional)`;
  console.log(`\n▶ ${label}`);

  if (NON_TRANSACTIONAL_FILES.has(file)) {
    await runConcurrentFile(file);
  } else {
    await runTransactionalFile(file);
    console.log(`  ✓ ${file} applied`);
  }

  await markApplied(file);
  appliedMap.set(file, { filename: file });
  return alreadyApplied ? "re-applied" : "applied";
}

async function printStatus(files, appliedMap) {
  console.log("\nMigration status:\n");
  for (const file of files) {
    const applied = appliedMap.get(file);
    const status = applied ? "APPLIED " : "PENDING ";
    const appliedAt = applied?.applied_at
      ? new Date(applied.applied_at).toISOString()
      : "-";
    console.log(`${status} v${extractVersion(file).toString().padStart(2, "0")}  ${file}  ${appliedAt}`);
  }
}

(async () => {
  const target = normalizeTarget(process.argv[2]);
  const force = process.argv.includes("--force");
  const startedAt = Date.now();

  try {
    const files = listMigrationFiles();
    const selectedFiles = files.filter((file) => fileMatchesTarget(file, target));
    const appliedMap = await getAppliedMap();

    if (target === "status") {
      await printStatus(files, appliedMap);
      return;
    }

    if (selectedFiles.length === 0) {
      throw new Error(`No migration files matched target "${target}"`);
    }

    let appliedCount = 0;
    let skippedCount = 0;
    let reappliedCount = 0;

    for (const file of selectedFiles) {
      const result = await runFile(file, force, appliedMap);
      if (result === "applied") appliedCount++;
      if (result === "re-applied") reappliedCount++;
      if (result === "skipped") skippedCount++;
    }

    await analyzeCoreTables();
    console.log(
      `\n✅ Done in ${Math.round((Date.now() - startedAt) / 1000)}s ` +
        `(applied: ${appliedCount}, re-applied: ${reappliedCount}, skipped: ${skippedCount})`
    );
  } catch (error) {
    console.error("\n❌ Migration aborted:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
