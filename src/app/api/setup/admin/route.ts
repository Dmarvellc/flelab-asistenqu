import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");

        // 1. Create or Get Agency
        let agencyId;
        const agencyRes = await client.query("SELECT agency_id FROM public.agency WHERE name = 'Flelabs'");
        if (agencyRes.rows.length > 0) {
            agencyId = agencyRes.rows[0].agency_id;
        } else {
            const newAgency = await client.query(
                "INSERT INTO public.agency (name, address) VALUES ('Flelabs', 'HQ') RETURNING agency_id"
            );
            agencyId = newAgency.rows[0].agency_id;
        }

        // 2. Create or Update User
        const email = "admin@gmail.com";
        const password = "admin123";
        const hashedPassword = await bcrypt.hash(password, 10);
        const role = "admin_agency";

        // Check if user exists
        const userRes = await client.query("SELECT user_id FROM public.app_user WHERE email = $1", [email]);

        if (userRes.rows.length > 0) {
            // Update existing user
            const userId = userRes.rows[0].user_id;
            await client.query(
                "UPDATE public.app_user SET role = $1, password_hash = $2, agency_id = $3, status = 'ACTIVE' WHERE user_id = $4",
                [role, hashedPassword, agencyId, userId]
            );
            // Update auth.users password if using it (optional but good practice)
            await client.query(
                "UPDATE auth.users SET encrypted_password = $1 WHERE id = $2",
                [hashedPassword, userId]
            );

        } else {
            // Create new user
            // Generate ID
            const idRes = await client.query("SELECT gen_random_uuid() as id");
            const userId = idRes.rows[0].id;

            // Insert into auth.users (mocking supabase auth table if needed)
            await client.query(`
          INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
          VALUES ($1, $2, $3, 'authenticated', 'authenticated', NOW(), NOW())
      `, [userId, email, hashedPassword]);

            // Insert into public.app_user
            await client.query(
                `INSERT INTO public.app_user (user_id, email, password_hash, role, status, agency_id, approved_at)
         VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW())`,
                [userId, email, hashedPassword, role, agencyId]
            );
        }

        await client.query("COMMIT");
        return NextResponse.json({ success: true, message: `Admin user ${email} set up for agency Flelabs` });

    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error("Setup Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
