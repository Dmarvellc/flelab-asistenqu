import { NextResponse } from "next/server";
import { z } from "zod";
import { type PoolClient } from "pg";
import { AuthError, requireSession } from "@/lib/auth";
import { type Role } from "@/lib/rbac";
import { dbPool } from "@/lib/db";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

const claimIdSchema = z.string().uuid();
const allowedRoles = ["hospital_admin", "super_admin", "developer"] as const;
const patchClaimSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(4_000).optional(),
    reviewNote: z.string().trim().max(4_000).optional(),
  })
  .transform((payload) => ({
    status: payload.status,
    reviewNote: payload.reviewNote ?? payload.note ?? "",
  }));

type AllowedRole = (typeof allowedRoles)[number];

type AuthorizedClaimSummary = {
  claim_id: string;
  status: string;
  hospital_notes: string | null;
  updated_at: string;
};

type ClaimDetailRow = {
  claim_id: string;
  claim_date: string | null;
  status: string;
  stage: string | null;
  total_amount: string | number | null;
  notes: string | null;
  hospital_notes: string | null;
  client_name: string | null;
  gender: string | null;
  birth_date: string | null;
  nik: string | null;
  phone_number: string | null;
  address: string | null;
  policy_number: string | null;
  disease_name: string | null;
  hospital_name: string | null;
  created_at: string;
  updated_at: string;
};

type InfoRequestRow = {
  request_id: string;
  form_schema: unknown;
  response_data: unknown;
  status: string;
  created_at: string;
  updated_at: string | null;
};

class HospitalClaimError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HospitalClaimError";
    this.status = status;
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof HospitalClaimError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  console.error("Hospital claim route failed", error);
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}

function assertAllowedRole(role: Role): asserts role is AllowedRole {
  if (!allowedRoles.includes(role as AllowedRole)) {
    throw new AuthError(403, "Forbidden");
  }
}

function appendHospitalNote(existing: string | null, next: string, fallback: string) {
  const normalizedExisting = existing?.trim() ?? "";
  const normalizedNext = next.trim() || fallback;

  if (!normalizedNext) {
    return normalizedExisting || null;
  }

  return normalizedExisting ? `${normalizedExisting}\n${normalizedNext}` : normalizedNext;
}

async function getAuthorizedClaimSummary(
  client: PoolClient,
  claimId: string,
  session: { role: Role; userId: string },
  options?: { forUpdate?: boolean }
) {
  const lockClause = options?.forUpdate ? "FOR UPDATE OF c" : "";

  const result = await client.query<AuthorizedClaimSummary>(
    `
      SELECT
        c.claim_id,
        c.status,
        c.hospital_notes,
        c.updated_at
      FROM public.claim c
      WHERE c.claim_id = $1
        AND c.status <> 'DRAFT'
        AND (
          $2 IN ('super_admin', 'developer')
          OR (
            $2 = 'hospital_admin'
            AND EXISTS (
              SELECT 1
              FROM public.user_role ur
              WHERE ur.user_id = $3
                AND ur.scope_type = 'HOSPITAL'
                AND ur.scope_id = c.hospital_id::text
            )
          )
        )
      ${lockClause}
    `,
    [claimId, session.role, session.userId]
  );

  return result.rows[0] ?? null;
}

async function getAuthorizedClaimDetail(
  client: PoolClient,
  claimId: string,
  session: { role: Role; userId: string }
) {
  const result = await client.query<ClaimDetailRow>(
    `
      SELECT
        c.claim_id,
        c.claim_date,
        c.status,
        c.stage,
        c.total_amount,
        c.notes,
        c.hospital_notes,
        p.full_name AS client_name,
        p.gender,
        p.birth_date,
        p.id_card AS nik,
        p.phone_number,
        p.address,
        ct.contract_number AS policy_number,
        d.name AS disease_name,
        h.name AS hospital_name,
        c.created_at,
        c.updated_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.claim_id = $1
        AND c.status <> 'DRAFT'
        AND (
          $2 IN ('super_admin', 'developer')
          OR (
            $2 = 'hospital_admin'
            AND EXISTS (
              SELECT 1
              FROM public.user_role ur
              WHERE ur.user_id = $3
                AND ur.scope_type = 'HOSPITAL'
                AND ur.scope_id = c.hospital_id::text
            )
          )
        )
      LIMIT 1
    `,
    [claimId, session.role, session.userId]
  );

  return result.rows[0] ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);

    const authorizedClaim = await getAuthorizedClaimSummary(client, claimId, session);
    if (!authorizedClaim) {
      throw new HospitalClaimError(404, "Claim not found");
    }

    const cacheKey = `claims:hospital:detail:${claimId}:${session.userId}`;
    const cached = await getJsonCache<{
      version: string;
      claim: ClaimDetailRow;
      infoRequests: InfoRequestRow[];
    }>(cacheKey);

    if (cached && cached.version === new Date(authorizedClaim.updated_at).toISOString()) {
      return NextResponse.json({
        claim: cached.claim,
        infoRequests: cached.infoRequests,
      });
    }

    const claim = await getAuthorizedClaimDetail(client, claimId, session);
    if (!claim) {
      throw new HospitalClaimError(404, "Claim not found");
    }

    const infoRequestsResult = await client.query<InfoRequestRow>(
      `
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
      `,
      [claimId]
    );

    const response = {
      claim,
      infoRequests: infoRequestsResult.rows,
    };

    await setJsonCache(
      cacheKey,
      {
        version: new Date(claim.updated_at).toISOString(),
        ...response,
      },
      30
    );

    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);
    const body = patchClaimSchema.parse(await request.json());

    await client.query("BEGIN");

    const claim = await getAuthorizedClaimSummary(client, claimId, session, { forUpdate: true });
    if (!claim) {
      throw new HospitalClaimError(404, "Claim not found");
    }

    if (["APPROVED", "REJECTED"].includes(claim.status)) {
      throw new HospitalClaimError(409, "Claim has already been finalized");
    }

    if (body.status === "APPROVED") {
      if (!["SUBMITTED", "INFO_SUBMITTED"].includes(claim.status)) {
        throw new HospitalClaimError(409, "Only submitted claims can be approved");
      }

      const documentCountResult = await client.query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM public.claim_document
          WHERE claim_id = $1
        `,
        [claimId]
      );

      const documentCount = documentCountResult.rows[0]?.count ?? 0;
      if (documentCount < 1) {
        throw new HospitalClaimError(400, "Cannot approve claim without supporting documents");
      }

      const pendingInfoRequestResult = await client.query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM public.claim_info_request
          WHERE claim_id = $1
            AND status = 'PENDING'
        `,
        [claimId]
      );

      const pendingInfoRequestCount = pendingInfoRequestResult.rows[0]?.count ?? 0;
      if (pendingInfoRequestCount > 0) {
        throw new HospitalClaimError(
          409,
          "Cannot approve claim while additional info requests are still pending"
        );
      }
    }

    const noteFallback =
      body.status === "APPROVED" ? "Claim approved by hospital." : "Claim rejected by hospital.";
    const hospitalNotes = appendHospitalNote(claim.hospital_notes, body.reviewNote, noteFallback);

    const updateResult = await client.query<{
      claim_id: string;
      status: string;
      hospital_notes: string | null;
      updated_at: string;
    }>(
      `
        UPDATE public.claim
        SET
          status = $1,
          hospital_notes = $2,
          updated_at = NOW()
        WHERE claim_id = $3
        RETURNING claim_id, status, hospital_notes, updated_at
      `,
      [body.status, hospitalNotes, claimId]
    );

    await client.query(
      `
        INSERT INTO public.claim_timeline (
          claim_id,
          event_type,
          to_status,
          actor_user_id,
          note,
          extra_data
        )
        VALUES ($1, 'STATUS_CHANGE', $2, $3, $4, $5)
      `,
      [
        claimId,
        body.status,
        session.userId,
        body.reviewNote.trim() || noteFallback,
        JSON.stringify({
          actorRole: session.role,
          previousStatus: claim.status,
          newStatus: body.status,
          source: "hospital_claim_detail_patch",
        }),
      ]
    );

    await client.query("COMMIT");

    await Promise.all([
      deleteCacheByPattern(`claims:hospital:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:hospital:detail:${claimId}`),
      deleteCacheByPattern(`claims:agent:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:agent:documents:${claimId}`),
      deleteCacheByPattern(`claims:agent:info-request:${claimId}`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}`),
      deleteCacheByPattern("claims:hospital:list:*"),
      deleteCacheByPattern("claims:agent:list:*"),
    ]);

    return NextResponse.json({
      claim: updateResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return toErrorResponse(error);
  } finally {
    client.release();
  }
}
