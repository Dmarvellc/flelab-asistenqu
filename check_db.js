const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const res = await pool.query("SELECT email, password_hash, role, is_sandbox FROM public.app_user WHERE email = 'sandbox.agent.udndh@dev.test'");
  console.log(res.rows);
  pool.end();
}

main();
