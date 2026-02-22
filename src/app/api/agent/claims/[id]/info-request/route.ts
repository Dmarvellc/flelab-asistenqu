import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const { id } = await params;
        const cacheKey = `claims:agent:info-request:${id}`;
        const cached = await getJsonCache<{ request: unknown }>(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Get the latest pending request for this claim
        const result = await client.query(`
            SELECT request_id, form_schema, status, created_at
            FROM public.claim_info_request
            WHERE claim_id = $1 AND status = 'PENDING'
            ORDER BY created_at DESC
            LIMIT 1
        `, [id]);

        if (result.rows.length === 0) {
            const response = { request: null };
            await setJsonCache(cacheKey, response, 30);
            return NextResponse.json(response);
        }

        const response = { request: result.rows[0] };
        await setJsonCache(cacheKey, response, 30);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Fetch info request failed", error);
        return NextResponse.json({ error: "Failed to fetch info request" }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { request_id, responses } = body;

        if (!request_id || !responses) {
            return NextResponse.json({ error: "Request ID and responses are required" }, { status: 400 });
        }

        // Begin transaction
        await client.query('BEGIN');

        // 1. Update info request
        await client.query(`
            UPDATE public.claim_info_request
            SET status = 'COMPLETED', response_data = $1, updated_at = NOW()
            WHERE request_id = $2
        `, [JSON.stringify(responses), request_id]);

        // 2. Update claim status
        await client.query(`
            UPDATE public.claim
            SET status = 'INFO_SUBMITTED', updated_at = NOW()
            WHERE claim_id = $1
        `, [id]);

        // 3. Add to timeline
        await client.query(`
            INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id, note)
            VALUES ($1, 'INFO_SUBMITTED', 'INFO_SUBMITTED', $2, 'Data tambahan telah dikirim oleh agen.')
        `, [id, userId]);

        await client.query('COMMIT');

        await deleteCacheByPattern(`claims:agent:info-request:${id}`);
        await deleteCacheByPattern(`claims:agent:detail:${id}:*`);
        await deleteCacheByPattern(`claims:hospital:detail:${id}`);
        await deleteCacheByPattern("claims:agent:list:*");
        await deleteCacheByPattern("claims:hospital:list:*");

        return NextResponse.json({ success: true });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Submit info failed", error);
        return NextResponse.json({ error: "Failed to submit info" }, { status: 500 });
    } finally {
        client.release();
    }
}
