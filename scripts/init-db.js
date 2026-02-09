require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const sqlPath = path.join(__dirname, "../db/app_user.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Running schema from db/app_user.sql...");
    await pool.query(sql);
    console.log("Schema initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
