import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

// GET LOGs for a claim
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const result = await client.query(`
      SELECT 
        c.claim_id, c.claim_number, c.log_number, c.log_issued_at, c.log_file_url,
        c.log_sent_to_hospital_at, c.log_verified_at, c.insurance_name, c.insurance_contact,
        c.stage
      FROM public.claim c
      WHERE c.claim_id = $1 AND c.created_by_user_id = $2
    `, [id, userId]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }
        return NextResponse.json({ log: result.rows[0] });
    } catch (e) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    } finally {
        client.release();
    }
}

// POST: Issue LOG or Send LOG to hospital
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { action, log_number, insurance_name, insurance_contact, log_file_url } = body;

        if (action === 'ISSUE_LOG') {
            // Agent got LOG from insurance, record it
            const result = await client.query(`
        UPDATE public.claim
        SET 
          log_number = $1,
          log_issued_at = NOW(),
          log_issued_by = $2,
          insurance_name = $3,
          insurance_contact = $4,
          log_file_url = $5,
          stage = 'LOG_ISSUED',
          updated_at = NOW()
        WHERE claim_id = $6 AND created_by_user_id = $2
        RETURNING claim_id, claim_number, stage
      `, [log_number, userId, insurance_name, insurance_contact, log_file_url || null, id]);

            if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

            // Add timeline
            await client.query(`
        INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id, extra_data)
        VALUES ($1, 'LOG_ISSUED', 'LOG_ISSUED', $2, $3)
      `, [id, userId, JSON.stringify({ log_number, insurance_name })]);

            return NextResponse.json({ claim: result.rows[0] });
        }

        if (action === 'SEND_LOG_TO_HOSPITAL') {
            // Agent sent LOG to hospital
            const result = await client.query(`
        UPDATE public.claim
        SET 
          log_sent_to_hospital_at = NOW(),
          stage = 'LOG_SENT_TO_HOSPITAL',
          updated_at = NOW()
        WHERE claim_id = $1 AND created_by_user_id = $2
        RETURNING claim_id, claim_number, stage
      `, [id, userId]);

            if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

            await client.query(`
        INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id)
        VALUES ($1, 'LOG_SENT_TO_HOSPITAL', 'LOG_SENT_TO_HOSPITAL', $2)
      `, [id, userId]);

            return NextResponse.json({ claim: result.rows[0] });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (e) {
        console.error("LOG action error", e);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    } finally {
        client.release();
    }
}
