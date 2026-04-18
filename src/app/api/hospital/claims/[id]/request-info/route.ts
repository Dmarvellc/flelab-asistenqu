import { NextResponse } from "next/server";
import { z } from "zod";
import { type PoolClient } from "pg";
import { AuthError, requireSession } from "@/lib/auth";
import { type Role } from "@/lib/rbac";
import { dbPool } from "@/lib/db";
import { deleteCacheByPattern, getJsonCache, setJsonCache } from "@/lib/redis";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

const claimIdSchema = z.string().uuid();
const allowedRoles = ["hospital_admin", "super_admin", "developer"] as const;
const allowedClaimStatusesForInfoRequest = new Set(["SUBMITTED", "INFO_SUBMITTED"]);

const infoRequestFieldSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    label: z.string().trim().min(1).max(200),
    type: z.enum(["text", "number", "date", "select"]),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && (!field.options || field.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Select fields must include at least one option.",
      });
    }

    if (field.type !== "select" && field.options && field.options.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Only select fields may include options.",
      });
    }
  });

const createInfoRequestSchema = z
  .object({
    fields: z.array(infoRequestFieldSchema).min(1).max(25),
    note: z.string().trim().max(4_000).optional().default(""),
  })
  .superRefine((payload, ctx) => {
    const seenIds = new Set<string>();
    const seenLabels = new Set<string>();

    payload.fields.forEach((field, index) => {
      const normalizedId = field.id.trim().toLowerCase();
      const normalizedLabel = field.label.trim().toLowerCase();

      if (seenIds.has(normalizedId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "id"],
          message: "Field IDs must be unique.",
        });
      }

      if (seenLabels.has(normalizedLabel)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "label"],
          message: "Field labels must be unique.",
        });
      }

      seenIds.add(normalizedId);
      seenLabels.add(normalizedLabel);
    });
  });

type AllowedRole = (typeof allowedRoles)[number];

type AuthorizedClaimSummary = {
  claim_id: string;
  status: string;
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

class HospitalClaimInfoRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HospitalClaimInfoRequestError";
    this.status = status;
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof HospitalClaimInfoRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  logError("api.hospital.claims.request-info", error, {
    requestPath: "/api/hospital/claims/[id]/request-info",
    isPublicFacing: true,
  });
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}

function assertAllowedRole(role: Role): asserts role is AllowedRole {
  if (!allowedRoles.includes(role as AllowedRole)) {
    throw new AuthError(403, "Forbidden");
  }
}

async function getAuthorizedHospitalClaim(
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
                AND ur.scope_id = c.hospital_id
            )
          )
        )
      ${lockClause}
    `,
    [claimId, session.role, session.userId]
  );

  return result.rows[0] ?? null;
}

function buildRequestInfoResponse(requests: InfoRequestRow[]) {
  const pendingRequest = requests.find((request) => request.status === "PENDING") ?? null;

  return {
    request: pendingRequest,
    requests,
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);

    const claim = await getAuthorizedHospitalClaim(client, claimId, session);
    if (!claim) {
      throw new HospitalClaimInfoRequestError(404, "Claim not found");
    }

    const cacheKey = `claims:hospital:pending-info-request:${claimId}:${session.userId}`;
    const cached = await getJsonCache<{
      version: string;
      request: InfoRequestRow | null;
      requests: InfoRequestRow[];
    }>(cacheKey);

    if (cached && cached.version === new Date(claim.updated_at).toISOString()) {
      return NextResponse.json({
        request: cached.request,
        requests: cached.requests,
      });
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
        ORDER BY created_at DESC
      `,
      [claimId]
    );

    const response = buildRequestInfoResponse(infoRequestsResult.rows);

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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    assertAllowedRole(session.role);

    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);
    const body = createInfoRequestSchema.parse(await request.json());

    await client.query("BEGIN");

    const claim = await getAuthorizedHospitalClaim(client, claimId, session, { forUpdate: true });
    if (!claim) {
      throw new HospitalClaimInfoRequestError(404, "Claim not found");
    }

    if (!allowedClaimStatusesForInfoRequest.has(claim.status)) {
      throw new HospitalClaimInfoRequestError(
        409,
        "Additional information can only be requested for submitted claims."
      );
    }

    const pendingRequestResult = await client.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM public.claim_info_request
        WHERE claim_id = $1
          AND status = 'PENDING'
      `,
      [claimId]
    );

    const pendingRequestCount = pendingRequestResult.rows[0]?.count ?? 0;
    if (pendingRequestCount > 0) {
      throw new HospitalClaimInfoRequestError(
        409,
        "An additional information request is already pending for this claim."
      );
    }

    const timelineNote =
      body.note.trim() || "Permintaan data tambahan dikirim ke agen.";

    const requestResult = await client.query<{
      request_id: string;
      form_schema: unknown;
      status: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `
        INSERT INTO public.claim_info_request (
          claim_id,
          created_by_user_id,
          form_schema,
          status
        )
        VALUES ($1, $2, $3, 'PENDING')
        RETURNING request_id, form_schema, status, created_at, updated_at
      `,
      [claimId, session.userId, JSON.stringify(body.fields)]
    );

    await client.query(
      `
        UPDATE public.claim
        SET status = 'INFO_REQUESTED', updated_at = NOW()
        WHERE claim_id = $1
      `,
      [claimId]
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
        VALUES ($1, 'INFO_REQUESTED', 'INFO_REQUESTED', $2, $3, $4)
      `,
      [
        claimId,
        session.userId,
        timelineNote,
        JSON.stringify({
          actorRole: session.role,
          previousStatus: claim.status,
          newStatus: "INFO_REQUESTED",
          requestId: requestResult.rows[0].request_id,
          fieldCount: body.fields.length,
        }),
      ]
    );

    await client.query("COMMIT");

    await Promise.all([
      deleteCacheByPattern(`claims:hospital:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:hospital:detail:${claimId}`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}:*`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}`),
      deleteCacheByPattern(`claims:agent:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:agent:info-request:${claimId}`),
      deleteCacheByPattern("claims:hospital:list:*"),
      deleteCacheByPattern("claims:agent:list:*"),
    ]);

    return NextResponse.json(
      {
        success: true,
        request_id: requestResult.rows[0].request_id,
        request: {
          ...requestResult.rows[0],
          response_data: null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return toErrorResponse(error);
  } finally {
    client.release();
  }
}
