import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cacheKey = `claims:hospital:detail:${id}`;
    const cached = await getJsonCache<{ claim: unknown; infoRequests: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await client.query(`
      SELECT 
        c.claim_id,
        c.claim_date,
        c.status,
        c.total_amount,
        c.notes,
        p.full_name as client_name,
        p.gender,
        p.birth_date,
        p.id_card as nik,
        p.phone_number,
        p.address,
        ct.contract_number as policy_number,
        d.name as disease_name,
        h.name as hospital_name,
        c.created_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.claim_id = $1 AND c.status != 'DRAFT'
    `, [id]);

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Fetch info requests history
    const infoRequestsResult = await client.query(`
      SELECT 
        request_id,
        form_schema,
        response_data,
        status,
        created_at,
        updated_at
      FROM public.claim_info_request
      WHERE claim_id = $1
      ORDER BY created_at ASC
    `, [id]);

    const response = { 
        claim: result.rows[0],
        infoRequests: infoRequestsResult.rows
    };
    await setJsonCache(cacheKey, response, 30);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Fetch claim failed", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const claimCheckRes = await client.query(
      `
      SELECT claim_id, status
      FROM public.claim
      WHERE claim_id = $1
      `,
      [id]
    );

    if (claimCheckRes.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const currentStatus = claimCheckRes.rows[0].status;

    if (status === "APPROVED") {
      // Hospital rule: only claim that has been submitted by agent can be approved.
      if (!["SUBMITTED", "INFO_SUBMITTED"].includes(currentStatus)) {
        return NextResponse.json(
          { error: "Only submitted claims can be approved" },
          { status: 400 }
        );
      }

      // Hospital rule: claim must include at least one supporting document.
      const docCountRes = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM public.claim_document
        WHERE claim_id = $1
        `,
        [id]
      );
      const docCount = docCountRes.rows[0]?.count ?? 0;
      if (docCount < 1) {
        return NextResponse.json(
          { error: "Cannot approve claim without supporting documents" },
          { status: 400 }
        );
      }

      // Hospital rule: no pending additional info request is allowed.
      const pendingInfoReqRes = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM public.claim_info_request
        WHERE claim_id = $1 AND status = 'PENDING'
        `,
        [id]
      );
      const pendingInfoCount = pendingInfoReqRes.rows[0]?.count ?? 0;
      if (pendingInfoCount > 0) {
        return NextResponse.json(
          { error: "Cannot approve claim while additional info request is still pending" },
          { status: 400 }
        );
      }
    }

    const result = await client.query(
      `
      UPDATE public.claim
      SET status = $1, updated_at = NOW()
      WHERE claim_id = $2
      RETURNING claim_id, status
      `,
      [status, id]
    );

    if (result.rows.length === 0) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Add to timeline
    await client.query(`
      INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id)
      VALUES ($1, 'STATUS_CHANGE', $2, $3)
    `, [id, status, userId]);

    await deleteCacheByPattern(`claims:hospital:detail:${id}`);
    await deleteCacheByPattern(`claims:agent:detail:${id}:*`);
    await deleteCacheByPattern(`claims:agent:documents:${id}`);
    await deleteCacheByPattern("claims:hospital:list:*");
    await deleteCacheByPattern("claims:agent:list:*");
    return NextResponse.json({ claim: result.rows[0] });

  } catch (error) {
    console.error("Update claim failed", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  } finally {
    client.release();
  }
}
