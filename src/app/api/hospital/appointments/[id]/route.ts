import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { getHospitalIdByUserId } from "@/services/claims";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_hospital_user_id")?.value ?? cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const hospitalId = await getHospitalIdByUserId(userId);
        if (!hospitalId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { status, hospital_notes, appointment_date, appointment_time } = body;

        const checkRes = await client.query(
            "SELECT hospital_id FROM public.appointment WHERE appointment_id = $1",
            [id]
        );
        if (checkRes.rows.length === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (checkRes.rows[0].hospital_id !== hospitalId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const result = await client.query(`
      UPDATE public.appointment
      SET 
        status = COALESCE($2, status),
        hospital_notes = COALESCE($3, hospital_notes),
        appointment_date = COALESCE($4, appointment_date),
        appointment_time = COALESCE($5, appointment_time),
        confirmed_at = CASE WHEN $2 = 'CONFIRMED' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE appointment_id = $1
      RETURNING *
    `, [
            id,
            status !== undefined ? status : null,
            hospital_notes !== undefined ? hospital_notes : null,
            appointment_date !== undefined ? appointment_date : null,
            appointment_time !== undefined ? appointment_time : null,
        ]);

        if (result.rowCount === 0) {
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
