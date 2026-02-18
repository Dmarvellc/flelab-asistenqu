
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkPersonSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();
    try {
        const res = await client.query("SELECT * FROM public.person LIMIT 0");
        console.log("Person columns:", res.fields.map(f => f.name));
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        client.release();
        pool.end();
    }
}

checkPersonSchema();
