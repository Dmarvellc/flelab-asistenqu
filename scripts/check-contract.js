
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkContractSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM public.contract LIMIT 0");
        console.log("Contract columns:", res.fields.map(f => f.name));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkContractSchema();
