import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db"; // Assuming direct DB access as in other routes, or use lib helper if available

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const role = cookieStore.get("rbac_role")?.value;

    if (role !== "developer") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        const client = await dbPool.connect();
        try {
            await client.query("BEGIN");

            // Set status to REJECTED (or similar) or DELETE depending on requirement.
            // Usually "Decline" means they need to re-apply or are banned.
            // Let's set status to 'REJECTED' to keep record, or 'INACTIVE'.
            // If we delete, they can re-register.
            // Let's assume hard delete for "Decline logic" for pending users as requested "decline akun".
            // But typically we might want to keep the email.
            // Let's check schema.
            // For now, I'll update status to 'REJECTED'.

            // Check if 'REJECTED' is a valid enum value?
            // Just in case check create table. If status is text, it's fine.
            // Assuming status is text or has REJECTED.
            // If not, I'll Delete the user_person_link and user entries?
            // Let's try update status to 'REJECTED' first.

            const updateRes = await client.query(
                "UPDATE public.users SET status = 'REJECTED' WHERE user_id = $1 RETURNING *",
                [userId]
            );

            if (updateRes.rowCount === 0) {
                throw new Error("User not found");
            }

            await client.query("COMMIT");
            return NextResponse.json({ success: true, message: "User rejected successfully" });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Reject error", error);
        return NextResponse.json({ error: "Failed to reject user" }, { status: 500 });
    }
}
