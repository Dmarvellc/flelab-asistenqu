import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

// GET coverage periods for a claim
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const result = await client.query(`
      SELECT cp.* 
      FROM public.claim_coverage_period cp
      JOIN public.claim c ON cp.claim_id = c.claim_id
      WHERE cp.claim_id = $1 AND c.created_by_user_id = $2
      ORDER BY cp.period_type, cp.start_date
    `, [id, userId]);

        return NextResponse.json({ coverage_periods: result.rows });
    } catch (e) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    } finally {
        client.release();
    }
}

// POST: Add coverage period (before or after hospitalization)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const body = await req.json();
        const { period_type, start_date, end_date, amount, description } = body;

        if (!period_type || !start_date || !end_date) {
            return NextResponse.json({ error: "period_type, start_date, end_date required" }, { status: 400 });
        }
        if (!['BEFORE', 'AFTER'].includes(period_type)) {
            return NextResponse.json({ error: "period_type must be BEFORE or AFTER" }, { status: 400 });
        }

        // Validate claim belongs to agent
        const claimCheck = await client.query(
            "SELECT claim_id FROM public.claim WHERE claim_id = $1 AND created_by_user_id = $2",
            [id, userId]
        );
        if (claimCheck.rows.length === 0) {
            return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }

        // Calculate coverage days
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const is_eligible = diffDays <= 30; // max 30 days

        const result = await client.query(`
      INSERT INTO public.claim_coverage_period (
        claim_id, period_type, start_date, end_date, amount, description, is_eligible
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, period_type, start_date, end_date, amount || null, description || null, is_eligible]);

        return NextResponse.json({ coverage_period: result.rows[0] }, { status: 201 });
    } catch (e) {
        console.error("POST coverage period error", e);
        return NextResponse.json({ error: "Failed to add coverage period" }, { status: 500 });
    } finally {
        client.release();
    }
}

// DELETE coverage period
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const coverageId = searchParams.get("coverage_id");

        if (!coverageId) return NextResponse.json({ error: "coverage_id required" }, { status: 400 });

        await client.query(`
      DELETE FROM public.claim_coverage_period cp
      USING public.claim c
      WHERE cp.coverage_id = $1
        AND cp.claim_id = c.claim_id
        AND c.created_by_user_id = $2
    `, [coverageId, userId]);

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    } finally {
        client.release();
    }
}
