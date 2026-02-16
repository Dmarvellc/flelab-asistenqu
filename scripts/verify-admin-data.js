const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyAdminData() {
  const client = await pool.connect();
  try {
    console.log("Verifying Admin Agency Data...");
    
    const agentsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'agent'");
    const agentsCount = parseInt(agentsRes.rows[0].count);
    console.log(`Agents Count: ${agentsCount}`);
    
    const hospitalsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'hospital_admin'");
    const hospitalsCount = parseInt(hospitalsRes.rows[0].count);
    console.log(`Hospitals Count: ${hospitalsCount}`);
    
    const policiesRes = await client.query("SELECT COUNT(*) FROM public.client");
    const policiesCount = parseInt(policiesRes.rows[0].count);
    console.log(`Policies (Clients) Count: ${policiesCount}`);
    
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAdminData();
