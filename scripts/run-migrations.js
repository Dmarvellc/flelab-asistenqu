#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-shot migration runner.
 *
 * Usage:
 *   node scripts/run-migrations.js v7
 *   node scripts/run-migrations.js v8
 *   node scripts/run-migrations.js all
 *
 * - v7 (system_log): runs the full SQL inside a transaction.
 * - v8 (indexes):     runs each `CREATE INDEX CONCURRENTLY` individually OUTSIDE
 *                     a transaction (CONCURRENTLY cannot run inside BEGIN/COMMIT).
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL not set in .env.local");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("sslmode=require") || DATABASE_URL.includes("supabase.co")
    ? { rejectUnauthorized: false }
    : undefined,
  max: 4,
});

function readSql(file) {
  return fs.readFileSync(path.join(__dirname, "..", "db", file), "utf8");
}

/** Split SQL into top-level statements, respecting $$-quoted blocks. */
function splitStatements(sql) {
  const out = [];
  let buf = "";
  let inDollar = false;
  let dollarTag = "";
  const lines = sql.split("\n");
  for (const raw of lines) {
    const line = raw.replace(/--.*$/, ""); // strip line comments
    let i = 0;
    while (i < line.length) {
      if (!inDollar) {
        const m = line.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
        if (m) {
          inDollar = true;
          dollarTag = m[0];
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
      } else {
        if (line.slice(i).startsWith(dollarTag)) {
          inDollar = false;
          buf += dollarTag;
          i += dollarTag.length;
          continue;
        }
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

async function runV7() {
  console.log("\n▶ v7: system_log (transactional)");
  const sql = readSql("migration_v7_system_log.sql");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("  ✓ v7 applied");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("  ✗ v7 failed:", e.message);
    throw e;
  } finally {
    client.release();
  }
}

async function runV8() {
  console.log("\n▶ v8: performance indexes (CONCURRENTLY, no transaction)");
  const sql = readSql("migration_v8_performance_indexes.sql");
  const stmts = splitStatements(sql);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const stmt of stmts) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 90);
    try {
      // Each CONCURRENTLY index gets its own connection without a tx wrapper.
      await pool.query(stmt);
      ok++;
      console.log(`  ✓ ${preview}${stmt.length > 90 ? "…" : ""}`);
    } catch (e) {
      const msg = (e.message || "").toLowerCase();
      if (msg.includes("already exists")) {
        skipped++;
        console.log(`  • skipped (exists): ${preview.slice(0, 70)}`);
      } else if (msg.includes("does not exist") && msg.includes("relation")) {
        skipped++;
        console.warn(`  ⚠ skipped (table missing): ${preview.slice(0, 70)}`);
      } else {
        failed++;
        console.error(`  ✗ ${preview}\n    ${e.message}`);
      }
    }
  }
  console.log(`\n  v8 summary: ${ok} created, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) throw new Error("v8: one or more index statements failed");

  console.log("\n▶ ANALYZE (update planner stats)");
  const tables = [
    "public.claim",
    "public.client",
    "public.app_user",
    "public.user_role",
    "public.claim_document",
    "public.claim_info_request",
    "public.claim_timeline",
    "public.auth_session",
  ];
  for (const t of tables) {
    try {
      await pool.query(`ANALYZE ${t}`);
      console.log(`  ✓ ANALYZE ${t}`);
    } catch (e) {
      console.warn(`  ⚠ ANALYZE ${t} failed: ${e.message}`);
    }
  }
}

(async () => {
  const which = (process.argv[2] || "all").toLowerCase();
  const t0 = Date.now();
  try {
    if (which === "v7" || which === "all") await runV7();
    if (which === "v8" || which === "all") await runV8();
    console.log(`\n✅ Done in ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch (e) {
    console.error("\n❌ Migration aborted:", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
