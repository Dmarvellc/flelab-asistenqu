
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const client = await dbPool.connect();

    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify ownership: The user must be the hospital_id on the request
        const check = await client.query(
            `SELECT request_id FROM public.patient_data_request WHERE request_id = $1 AND hospital_id = $2`,
            [params.id, userId]
        );

        if (check.rowCount === 0) {
            return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 });
        }

        await client.query(
            `DELETE FROM public.patient_data_request WHERE request_id = $1`,
            [params.id]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete request failed", error);
        return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
    } finally {
        client.release();
    }
}
