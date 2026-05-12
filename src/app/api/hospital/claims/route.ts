import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { composeClaimNotes, type ClaimFormMeta } from "@/lib/claim-form-meta";
import { invalidate, CacheKeys } from "@/lib/cache";
import { deleteCacheByPattern, deleteCacheKeys } from "@/lib/redis";
import { dbPool } from "@/lib/db";
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims";
import { logError } from "@/lib/logger";

export async function GET() {
  let userId: string | null = null;
  try {
    userId = await getHospitalUserIdFromCookies();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hospitalId = await getHospitalIdByUserId(userId);
    const claims = await getHospitalClaims(hospitalId);

    return NextResponse.json({ claims });

  } catch (error) {
    logError("api.hospital.claims.list", error, {
      userId: userId ?? undefined,
      requestPath: "/api/hospital/claims",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let hospitalUserId: string | null = null;
  try {
    hospitalUserId = await getHospitalUserIdFromCookies();
    if (!hospitalUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hospitalId = await getHospitalIdByUserId(hospitalUserId);
    if (!hospitalId) {
      return NextResponse.json({ error: "Hospital not linked to user" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { client_id, claim_date, notes, claim_meta } = body as Record<string, unknown>;
    const disease_id = ("disease_id" in body && body.disease_id) ? body.disease_id : null;
    const rawAmount = (body as { total_amount?: unknown }).total_amount;
    const total_amount =
      rawAmount !== "" && rawAmount != null && rawAmount !== undefined ? rawAmount : null;

    if (!client_id || typeof client_id !== "string") {
      return NextResponse.json({ error: "client_id is required" }, { status: 400 });
    }
    if (!claim_date || typeof claim_date !== "string") {
      return NextResponse.json({ error: "claim_date is required" }, { status: 400 });
    }

    const pgClient = await dbPool.connect();

    try {
      const clientRes = await pgClient.query<{ person_id: string; agent_id: string | null }>(
        "SELECT person_id, agent_id FROM public.client WHERE client_id = $1",
        [client_id]
      );
      if (clientRes.rows.length === 0) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      const agentId = clientRes.rows[0].agent_id;
      if (!agentId) {
        return NextResponse.json(
          {
            error:
              "Nasabah belum terhubung dengan agen. Hubungi pusat layanan atau agen untuk mendaftarkan klaim dari rumah sakit.",
          },
          { status: 400 }
        );
      }

      const person_id = clientRes.rows[0].person_id;

      const contractRes = await pgClient.query<{ contract_id: string }>(
        `SELECT contract_id FROM public.contract WHERE client_id = $1 AND status = 'ACTIVE' LIMIT 1`,
        [client_id]
      );
      const contract_id =
        contractRes.rows.length > 0 ? contractRes.rows[0].contract_id ?? null : null;

      const composedNotes = composeClaimNotes(
        typeof notes === "string" ? notes : "",
        typeof claim_meta === "object" && claim_meta !== null ? (claim_meta as ClaimFormMeta) : undefined
      );

      const result = await pgClient.query<{ claim_id: string }>(
        `
        INSERT INTO public.claim (
          client_id, person_id, contract_id, hospital_id, disease_id,
          claim_date, total_amount, notes,
          assigned_agent_id, created_by_user_id, status, stage
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10,
          'SUBMITTED',
          'HOSPITAL_INITIATED'
        )
        RETURNING claim_id
      `,
        [
          client_id,
          person_id,
          contract_id,
          hospitalId,
          disease_id,
          claim_date,
          total_amount,
          composedNotes,
          agentId,
          hospitalUserId,
        ]
      );

      const claimId = result.rows[0]?.claim_id;
      if (!claimId) {
        return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
      }

      await Promise.all([
        invalidate([CacheKeys.agentClaims(agentId), CacheKeys.hospitalClaims(hospitalId)]),
        deleteCacheKeys([`claims:agent:list:${agentId}`]),
        deleteCacheByPattern("claims:hospital:list:*"),
        deleteCacheByPattern(`claims:hospital:detail:${claimId}`),
        deleteCacheByPattern(`claims:hospital:detail:${claimId}:*`),
        deleteCacheByPattern(`claims:agent:detail:${claimId}:*`),
      ]);

      return NextResponse.json({ claim_id: claimId }, { status: 201 });
    } finally {
      pgClient.release();
    }
  } catch (error) {
    logError("api.hospital.claims.create", error, {
      userId: hospitalUserId ?? undefined,
      requestPath: "/api/hospital/claims",
      requestMethod: "POST",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to create claim" }, { status: 500 });
  }
}
