import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { composeClaimNotes } from "@/lib/claim-form-meta";
import { deleteCacheByPattern, deleteCacheKeys } from "@/lib/redis";
import { cached, CacheKeys, TTL, invalidate } from "@/lib/cache";
import { logError } from "@/lib/logger";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.userId;

  try {
    const claims = await cached(CacheKeys.agentClaims(userId), TTL.SHORT, () => fetchAgentClaimRows(userId));
    return NextResponse.json({ claims });
  } catch (error) {
    logError("api.agent.claims.list", error, {
      userId,
      requestPath: "/api/agent/claims",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

async function fetchAgentClaimRows(userId: string) {
  const client = await dbPool.connect();
  try {
    const result = await client.query(`
      SELECT
        c.claim_id,
        c.claim_number,
        c.claim_date::text,
        c.status,
        c.stage,
        c.total_amount,
        c.log_number,
        c.log_issued_at,
        c.log_sent_to_hospital_at,
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
    return result.rows;
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const client = await dbPool.connect();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.userId;

    const body = await req.json();
    const { client_id, hospital_id, claim_date, notes, claim_meta } = body;
    const disease_id = body.disease_id || null;
    const total_amount = body.total_amount !== "" && body.total_amount != null ? body.total_amount : null;

    // Get person_id from client_id and verify client belongs to this agent
    const clientRes = await client.query(
      "SELECT person_id, agent_id FROM public.client WHERE client_id = $1",
      [client_id]
    );
    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (clientRes.rows[0].agent_id !== userId) {
      return NextResponse.json({ error: "Client does not belong to this agent" }, { status: 403 });
    }
    const person_id = clientRes.rows[0].person_id;
    const assigned_agent_id = clientRes.rows[0].agent_id ?? null;

    // Verify hospital exists
    const hospitalCheckRes = await client.query(
      "SELECT hospital_id FROM public.hospital WHERE hospital_id = $1",
      [hospital_id]
    );
    if (hospitalCheckRes.rows.length === 0) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

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
    await invalidate([CacheKeys.agentClaims(userId)]);
    await deleteCacheKeys([`claims:agent:list:${userId}`]);
    await deleteCacheByPattern("claims:hospital:list:*");
    await deleteCacheByPattern(`claims:hospital:detail:${claimId}`);
    await deleteCacheByPattern(`claims:agent:detail:${claimId}:*`);
    return NextResponse.json({ claim_id: claimId }, { status: 201 });

  } catch (error) {
    const session = await getSession().catch(() => null);
    logError("api.agent.claims.create", error, {
      userId: session?.userId,
      requestPath: "/api/agent/claims",
      requestMethod: "POST",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  } finally {
    client.release();
  }
}
