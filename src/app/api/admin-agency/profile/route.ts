import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserWithProfile, updateUserProfile } from "@/lib/auth-queries";
import { dbPool } from "@/lib/db";

export async function GET() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_admin_agency_user_id")?.value;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const user = await findUserWithProfile(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Failed to fetch profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_admin_agency_user_id")?.value;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Removed personal info update as frontend no longer sends it. Only process agency updates.

        // 2. Update agency info if they belong to one
        if (body.agency_name || body.agency_address) {
            const client = await dbPool.connect();
            try {
                // Get admin's agency id
                const userRes = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userId]);
                const agencyId = userRes.rows[0]?.agency_id;

                if (agencyId) {
                    await client.query(`
                        UPDATE public.agency 
                        SET name = COALESCE($1, name), address = COALESCE($2, address)
                        WHERE agency_id = $3
                    `, [body.agency_name || null, body.agency_address || null, agencyId]);
                }
            } finally {
                client.release();
            }
        }

        const updatedUser = await findUserWithProfile(userId);
        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error("Failed to update profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
