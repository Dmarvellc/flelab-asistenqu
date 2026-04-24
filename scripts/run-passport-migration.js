#!/usr/bin/env node
// One-off runner for migration_v11_person_passport.sql

const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Pool } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migration_v11_person_passport.sql"),
    "utf8"
  );
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("✓ v11 passport_number migration applied");
  } catch (e) {
    console.error("× failed:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
