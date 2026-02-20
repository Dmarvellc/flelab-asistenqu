import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { status, notes, appointment_date, appointment_time } = body;

        const result = await client.query(`
      UPDATE public.appointment
      SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        appointment_date = COALESCE($3, appointment_date),
        appointment_time = COALESCE($4, appointment_time),
        updated_at = NOW()
      WHERE appointment_id = $5 AND agent_user_id = $6
      RETURNING *
    `, [status, notes, appointment_date, appointment_time, id, userId]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ appointment: result.rows[0] });
    } catch (e) {
        console.error("PATCH appointment error", e);
        return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        await client.query(
            "DELETE FROM public.appointment WHERE appointment_id = $1 AND agent_user_id = $2",
            [id, userId]
        );
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE appointment error", e);
        return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
    } finally {
        client.release();
    }
}
