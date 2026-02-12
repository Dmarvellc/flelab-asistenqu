import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { fields } = body; // Array of field definitions

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
        return NextResponse.json({ error: "Fields are required" }, { status: 400 });
    }

    // Begin transaction
    await client.query('BEGIN');

    // 1. Create info request
    const requestRes = await client.query(`
      INSERT INTO public.claim_info_request (claim_id, created_by_user_id, form_schema, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING request_id
    `, [id, userId, JSON.stringify(fields)]);

    // 2. Update claim status
    await client.query(`
      UPDATE public.claim
      SET status = 'INFO_REQUESTED', updated_at = NOW()
      WHERE claim_id = $1
    `, [id]);

    // 3. Add to timeline
    await client.query(`
      INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id, note)
      VALUES ($1, 'INFO_REQUESTED', 'INFO_REQUESTED', $2, 'Permintaan data tambahan dikirim ke agen.')
    `, [id, userId]);

    await client.query('COMMIT');

    await deleteCacheByPattern(`claims:hospital:detail:${id}`);
    await deleteCacheByPattern(`claims:agent:detail:${id}:*`);
    await deleteCacheByPattern(`claims:agent:info-request:${id}`);
    await deleteCacheByPattern("claims:hospital:list:*");
    await deleteCacheByPattern("claims:agent:list:*");

    return NextResponse.json({ success: true, request_id: requestRes.rows[0].request_id });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Create info request failed", error);
    return NextResponse.json({ error: "Failed to create info request" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const client = await dbPool.connect();
    try {
        const { id } = await params;
        const cacheKey = `claims:hospital:pending-info-request:${id}`;
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
