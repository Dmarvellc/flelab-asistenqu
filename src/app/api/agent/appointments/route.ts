import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        p.full_name  AS client_name,
        h.name       AS hospital_name,
        d.full_name  AS doctor_name,
        c.claim_number
      FROM public.appointment a
      JOIN public.client cl ON a.client_id = cl.client_id
      JOIN public.person p  ON cl.person_id = p.person_id
      LEFT JOIN public.hospital h ON a.hospital_id = h.hospital_id
      LEFT JOIN public.person d   ON a.doctor_id   = d.person_id
      LEFT JOIN public.claim c    ON a.claim_id    = c.claim_id
      WHERE a.agent_user_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
    `, [userId]);

        return NextResponse.json({ appointments: result.rows });
    } catch (e) {
        console.error("GET appointments error", e);
        return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function POST(req: Request) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const {
            client_id,
            hospital_id,
            doctor_id,
            claim_id,
            appointment_date,
            appointment_time,
            appointment_type = "CONSULTATION",
            notes,
        } = body;

        if (!client_id || !appointment_date) {
            return NextResponse.json({ error: "client_id and appointment_date are required" }, { status: 400 });
        }

        const result = await client.query(`
      INSERT INTO public.appointment (
        client_id, hospital_id, doctor_id, claim_id,
        agent_user_id, appointment_date, appointment_time,
        appointment_type, status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SCHEDULED',$9)
      RETURNING *
    `, [
            client_id, hospital_id || null, doctor_id || null, claim_id || null,
            userId, appointment_date, appointment_time || null,
            appointment_type, notes || null,
        ]);

        return NextResponse.json({ appointment: result.rows[0] }, { status: 201 });
    } catch (e) {
        console.error("POST appointment error", e);
        return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
    } finally {
        client.release();
    }
}
