import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { getHospitalIdByUserId } from "@/services/claims";

export async function GET() {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = await getHospitalUserIdFromCookies();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const hospitalId = await getHospitalIdByUserId(userId);
        if (!hospitalId) {
            return NextResponse.json({ appointments: [] }); // or unauthorized/forbidden
        }

        const result = await client.query(`
      SELECT
        a.appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.appointment_type,
        a.status,
        a.notes,
        a.hospital_notes,
        a.confirmed_at,
        a.created_at,
        a.claim_id,
        p.full_name  AS client_name,
        d.full_name  AS doctor_name,
        c.claim_number
      FROM public.appointment a
      JOIN public.client cl ON a.client_id = cl.client_id
      JOIN public.person p  ON cl.person_id = p.person_id
      LEFT JOIN public.person d   ON a.doctor_id   = d.person_id
      LEFT JOIN public.claim c    ON a.claim_id    = c.claim_id
      WHERE a.hospital_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [hospitalId]);

        return NextResponse.json({ appointments: result.rows });
    } catch (e) {
        console.error("GET appointments error", e);
        return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    } finally {
        client.release();
    }
}
