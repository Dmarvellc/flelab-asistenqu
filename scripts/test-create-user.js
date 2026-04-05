require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testCreate() {
    const client = await pool.connect();
    try {
        const email = "test_agency" + Date.now() + "@example.com";
        const passwordHash = await bcrypt.hash("password123", 10);

        await client.query("BEGIN");

        console.log("Creating user...", email);

        const idRes = await client.query("SELECT gen_random_uuid() as id");
        const userId = idRes.rows[0].id;

        console.log("Inserting to auth.users with userId", userId);
        await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())
    `, [userId, email.toLowerCase(), passwordHash]);

        console.log("Inserting to public.app_user");
        await client.query(
            `insert into public.app_user (user_id, email, password_hash, role, status, approved_at, approved_by)
         values ($1, $2, $3, $4, 'ACTIVE', now(), $5)
         returning user_id, email, role, status`,
            [
                userId,
                email.toLowerCase(),
                passwordHash,
                "admin_agency",
                null,
            ]
        );

        console.log("Inserting to public.person");
        const personRes = await client.query(
            `insert into public.person (full_name, id_card, phone_number, address, birth_date, gender)
       values ($1, $2, $3, $4, $5, $6)
       returning person_id`,
            [
                "Test Agency",
                null, // nik
                "08123456789", // phoneNumber
                "Test Address", // address
                null, // birthDate
                null, // gender
            ]
        );
        const personId = personRes.rows[0].person_id;

        console.log("Inserting to public.user_person_link");
        await client.query(
            `insert into public.user_person_link (user_id, person_id, relation_type)
       values ($1, $2, 'OWNER')`,
            [userId, personId]
        );

        await client.query("ROLLBACK");
        console.log("SUCCESS! (rolled back)");
    } catch (err) {
        console.error("ERROR DURING CREATION:", err);
        await client.query("ROLLBACK");
    } finally {
        client.release();
        pool.end();
    }
}

testCreate();
