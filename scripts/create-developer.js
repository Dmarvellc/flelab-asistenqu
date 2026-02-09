require("dotenv").config({ path: ".env.local" });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

async function main() {
  const emailArg = process.argv.find((arg) => arg.startsWith("--email="));
  const passwordArg = process.argv.find((arg) =>
    arg.startsWith("--password=")
  );

  const email = emailArg && emailArg.split("=")[1];
  const password = passwordArg && passwordArg.split("=")[1];

  if (!email || !password) {
    console.error(
      "Usage: npm run create:developer -- --email=... --password=..."
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(
    `insert into public.app_user (email, password_hash, role, status, approved_at)
     values ($1, $2, 'developer', 'ACTIVE', now())
     on conflict (email) do nothing`,
    [email.toLowerCase(), passwordHash]
  );

  console.log("Developer account ready:", email);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
