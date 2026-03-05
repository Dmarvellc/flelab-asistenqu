const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
    try {
        const client = await pool.connect();

        // Get all tables in the public schema
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);

        const tables = res.rows.map(r => '"' + r.table_name + '"');

        if (tables.length === 0) {
            console.log("No tables found to truncate.");
            return;
        }

        const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`;

        console.log("Executing TRUNCATE on all tables...");
        await client.query(truncateQuery);

        console.log("✅ All data has been deleted successfully.");
        client.release();
    } catch (err) {
        console.error("Error truncating database:", err);
    } finally {
        await pool.end();
    }
}

resetDatabase();
