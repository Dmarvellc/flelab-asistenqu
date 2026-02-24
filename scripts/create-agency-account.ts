const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    const client = await pool.connect();
    try {
        const email = "agency@example.com";
        const password = "password123";
        const passwordHash = await bcrypt.hash(password, 10);
        const role = "admin_agency";

        // Provide some agency details
        const agencyName = "Test Agency Indonesia";
        const agencyAddress = "Jl. Sudirman No 1";

        await client.query("BEGIN");

        // Check if user already exists
        const checkRes = await client.query("SELECT * FROM public.app_user WHERE email = $1", [email]);
        if (checkRes.rows.length > 0) {
            console.log("Account already exists.");
            process.exit(0);
        }

        // Generate ID
        const idRes = await client.query("SELECT gen_random_uuid() as id");
        const userId = idRes.rows[0].id;

        // Create agency first
        const agencyRes = await client.query(
            `INSERT INTO public.agency (name, address)
       VALUES ($1, $2)
       RETURNING agency_id`,
            [agencyName, agencyAddress]
        );

        const agencyId = agencyRes.rows[0].agency_id;

        // Insert into auth.users (simulate supabase)
        await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())
    `, [userId, email, passwordHash]);

        // Insert into app_user
        await client.query(
            `insert into public.app_user (user_id, email, password_hash, role, status, approved_at, agency_id)
         values ($1, $2, $3, $4, 'ACTIVE', now(), $5)`,
            [userId, email, passwordHash, role, agencyId]
        );

        // Create Person
        const personRes = await client.query(
            `insert into public.person (full_name, phone_number)
         values ($1, $2)
         returning person_id`,
            ["Test Agency Admin", "+628123456789"]
        );
        const personId = personRes.rows[0].person_id;

        // Link
        await client.query(
            `insert into public.user_person_link (user_id, person_id, relation_type)
         values ($1, $2, 'OWNER')`,
            [userId, personId]
        );

        await client.query("COMMIT");
        console.log("Successfully created admin_agency account:", email);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Failed", err);
    } finally {
        client.release();
        pool.end();
    }
}
main();
