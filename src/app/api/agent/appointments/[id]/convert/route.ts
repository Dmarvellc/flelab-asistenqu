import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_agent_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;

        // Fetch appointment and verify ownership
        const apptRes = await client.query(
            `SELECT * FROM public.appointment WHERE appointment_id = $1 AND agent_user_id = $2`,
            [id, userId]
        );
        if (apptRes.rows.length === 0) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
        }
        const appt = apptRes.rows[0];

        if (appt.appointment_type !== "VISIT_LOG") {
            return NextResponse.json({ error: "Appointment is not a VISIT_LOG" }, { status: 400 });
        }
        if (appt.status !== "CONFIRMED") {
            return NextResponse.json({ error: "Rumah sakit belum mengkonfirmasi kunjungan ini" }, { status: 400 });
        }
        if (appt.claim_id) {
            return NextResponse.json({ error: "Already converted" }, { status: 409 });
        }

        // Get person_id from client
        const clientRes = await client.query(
            `SELECT person_id FROM public.client WHERE client_id = $1`,
            [appt.client_id]
        );
        if (clientRes.rows.length === 0) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }
        const person_id = clientRes.rows[0].person_id;

        // Get active contract (optional)
        const contractRes = await client.query(
            `SELECT contract_id FROM public.contract WHERE client_id = $1 AND status = 'ACTIVE' LIMIT 1`,
            [appt.client_id]
        );
        const contract_id = contractRes.rows.length > 0 ? contractRes.rows[0].contract_id : null;

        await client.query("BEGIN");

        // Create DRAFT claim pre-filled from LOG data
        const claimRes = await client.query(`
            INSERT INTO public.claim (
                client_id, person_id, contract_id,
                hospital_id, disease_id,
                claim_date, total_amount, notes,
                assigned_agent_id, created_by_user_id,
                status, stage
            ) VALUES ($1, $2, $3, $4, NULL, $5, 0, $6, $7, $7, 'DRAFT', 'DRAFT_AGENT')
            RETURNING claim_id
        `, [
            appt.client_id,
            person_id,
            contract_id,
            appt.hospital_id,
            appt.appointment_date,
            appt.notes,
            userId,
        ]);

        const claim_id = claimRes.rows[0].claim_id as string;

        // Mark appointment as converted
        await client.query(`
            UPDATE public.appointment
            SET claim_id = $1, status = 'COMPLETED', updated_at = NOW()
            WHERE appointment_id = $2
        `, [claim_id, id]);

        await client.query("COMMIT");

        return NextResponse.json({ claim_id }, { status: 201 });

    } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("Convert appointment to claim failed", e);
        return NextResponse.json({ error: "Failed to convert appointment" }, { status: 500 });
    } finally {
        client.release();
    }
}
