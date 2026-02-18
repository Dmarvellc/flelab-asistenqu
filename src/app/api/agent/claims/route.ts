import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { composeClaimNotes } from "@/lib/claim-form-meta";
import { deleteCacheByPattern, deleteCacheKeys, getJsonCache, setJsonCache } from "@/lib/redis";

export async function GET(req: Request) {
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `claims:agent:list:${userId}`;
    const cached = await getJsonCache<{ claims: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch claims for this agent
    const result = await client.query(`
      SELECT 
        c.claim_id,
        c.claim_date,
        c.status,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.created_by_user_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    const response = { claims: result.rows };
    await setJsonCache(cacheKey, response, 30);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Fetch claims failed", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { client_id, hospital_id, disease_id, claim_date, total_amount, notes, claim_meta } = body;

    // Get person_id from client_id
    const clientRes = await client.query(
      "SELECT person_id, agent_id FROM public.client WHERE client_id = $1",
      [client_id]
    );
    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    const person_id = clientRes.rows[0].person_id;
    const assigned_agent_id = clientRes.rows[0].agent_id ?? null;

    // Get contract_id for this client (assuming active contract)
    const contractRes = await client.query("SELECT contract_id FROM public.contract WHERE client_id = $1 AND status = 'ACTIVE' LIMIT 1", [client_id]);
    const contract_id = contractRes.rows.length > 0 ? contractRes.rows[0].contract_id : null;

    const composedNotes = composeClaimNotes(notes, claim_meta);

    const result = await client.query(`
      INSERT INTO public.claim (
        client_id, person_id, contract_id, hospital_id, disease_id, 
        claim_date, total_amount, notes, 
        assigned_agent_id, created_by_user_id, status, stage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'DRAFT', 'DRAFT_AGENT')
      RETURNING claim_id
    `, [
      client_id, person_id, contract_id, hospital_id, disease_id,
      claim_date, total_amount, composedNotes, assigned_agent_id, userId
    ]);

    const claimId = result.rows[0].claim_id as string;
    await deleteCacheKeys([`claims:agent:list:${userId}`]);
    await deleteCacheByPattern("claims:hospital:list:*");
    await deleteCacheByPattern(`claims:hospital:detail:${claimId}`);
    await deleteCacheByPattern(`claims:agent:detail:${claimId}:*`);
    return NextResponse.json({ claim_id: claimId }, { status: 201 });

  } catch (error) {
    console.error("Create claim failed", error);
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  } finally {
    client.release();
  }
}
