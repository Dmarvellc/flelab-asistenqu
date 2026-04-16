import { NextResponse } from "next/server";
import { z } from "zod";
import { type Role } from "@/lib/rbac";
import { AuthError, requireSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { deleteCacheByPattern } from "@/lib/redis";

export const dynamic = "force-dynamic";

const claimIdSchema = z.string().uuid();
const workflowActions = [
  "SEND_TO_HOSPITAL",
  "SEND_TO_AGENT",
  "SUBMIT_TO_AGENCY",
  "APPROVE",
  "REJECT",
] as const;

type WorkflowAction = (typeof workflowActions)[number];

const workflowRequestSchema = z.object({
  action: z.enum(workflowActions),
  notes: z.string().trim().max(4_000).optional().default(""),
});

const agentWorkflowStages = new Set(["DRAFT_AGENT", "PENDING_AGENT", "PENDING_AGENT_REVIEW"]);
const hospitalWorkflowStages = new Set([
  "PENDING_HOSPITAL",
  "DRAFT_HOSPITAL",
  "PENDING_HOSPITAL_INPUT",
]);

const actionRoleMatrix: Record<WorkflowAction, readonly Role[]> = {
  SEND_TO_HOSPITAL: ["agent", "agent_manager", "super_admin", "developer"],
  SEND_TO_AGENT: ["hospital_admin", "super_admin", "developer"],
  SUBMIT_TO_AGENCY: ["agent", "agent_manager", "super_admin", "developer"],
  APPROVE: ["admin_agency", "insurance_admin", "super_admin", "developer"],
  REJECT: [
    "hospital_admin",
    "admin_agency",
    "insurance_admin",
    "super_admin",
    "developer",
  ],
};

type AuthorizedClaim = {
  claim_id: string;
  stage: string | null;
  status: string | null;
  agent_notes: string | null;
  hospital_notes: string | null;
  admin_review_notes: string | null;
};

type TransitionResult = {
  newStage: string;
  newStatus: string;
  agentNotes: string | null;
  hospitalNotes: string | null;
  adminReviewNotes: string | null;
  timelineEventType: string;
  timelineNote: string;
};

class WorkflowError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WorkflowError";
    this.status = status;
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof WorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  console.error("Workflow update failed", error);
  return NextResponse.json({ error: "Failed to update claim workflow" }, { status: 500 });
}

function appendNote(existing: string | null, next: string, fallback: string) {
  const normalizedExisting = existing?.trim() ?? "";
  const normalizedNext = next.trim() || fallback;

  if (!normalizedNext) {
    return normalizedExisting || null;
  }

  return normalizedExisting ? `${normalizedExisting}\n${normalizedNext}` : normalizedNext;
}

function assertRoleAllowedForAction(role: Role, action: WorkflowAction) {
  const allowedRoles = actionRoleMatrix[action];
  if (!allowedRoles.includes(role)) {
    throw new AuthError(403, "Forbidden");
  }
}

function resolveTransition(params: {
  action: WorkflowAction;
  claim: AuthorizedClaim;
  role: Role;
  notes: string;
}): TransitionResult {
  const { action, claim, role, notes } = params;
  const currentStage = claim.stage ?? "";
  const currentStatus = claim.status ?? "";

  switch (action) {
    case "SEND_TO_HOSPITAL": {
      if (!agentWorkflowStages.has(currentStage)) {
        throw new WorkflowError(409, "Claim cannot be sent to hospital from the current stage");
      }

      return {
        newStage: "PENDING_HOSPITAL",
        newStatus: "IN_PROGRESS",
        agentNotes: appendNote(claim.agent_notes, notes, "Claim sent to hospital for review."),
        hospitalNotes: claim.hospital_notes,
        adminReviewNotes: claim.admin_review_notes,
        timelineEventType: "SEND_TO_HOSPITAL",
        timelineNote: notes.trim() || "Claim sent to hospital for review.",
      };
    }

    case "SEND_TO_AGENT": {
      if (!hospitalWorkflowStages.has(currentStage)) {
        throw new WorkflowError(409, "Claim cannot be returned to agent from the current stage");
      }

      return {
        newStage: "PENDING_AGENT",
        newStatus: "IN_PROGRESS",
        agentNotes: claim.agent_notes,
        hospitalNotes: appendNote(
          claim.hospital_notes,
          notes,
          "Hospital completed review and returned the claim to the agent."
        ),
        adminReviewNotes: claim.admin_review_notes,
        timelineEventType: "SEND_TO_AGENT",
        timelineNote: notes.trim() || "Hospital returned the claim to the agent.",
      };
    }

    case "SUBMIT_TO_AGENCY": {
      if (!agentWorkflowStages.has(currentStage)) {
        throw new WorkflowError(409, "Claim cannot be submitted to agency from the current stage");
      }

      return {
        newStage: "SUBMITTED_TO_AGENCY",
        newStatus: "REVIEW",
        agentNotes: appendNote(claim.agent_notes, notes, "Claim submitted to agency."),
        hospitalNotes: claim.hospital_notes,
        adminReviewNotes: claim.admin_review_notes,
        timelineEventType: "SUBMIT_TO_AGENCY",
        timelineNote: notes.trim() || "Claim submitted to agency for review.",
      };
    }

    case "APPROVE": {
      if (!(currentStage === "SUBMITTED_TO_AGENCY" || currentStatus === "REVIEW")) {
        throw new WorkflowError(409, "Only claims under agency review can be approved");
      }

      return {
        newStage: "APPROVED",
        newStatus: "APPROVED",
        agentNotes: claim.agent_notes,
        hospitalNotes: claim.hospital_notes,
        adminReviewNotes: appendNote(claim.admin_review_notes, notes, "Claim approved."),
        timelineEventType: "APPROVE",
        timelineNote: notes.trim() || "Claim approved.",
      };
    }

    case "REJECT": {
      if (role === "hospital_admin" || (role === "super_admin" || role === "developer") && hospitalWorkflowStages.has(currentStage)) {
        if (!hospitalWorkflowStages.has(currentStage)) {
          throw new WorkflowError(409, "Hospital rejection is not allowed from the current stage");
        }

        return {
          newStage: "REJECTED",
          newStatus: "REJECTED",
          agentNotes: claim.agent_notes,
          hospitalNotes: appendNote(claim.hospital_notes, notes, "Claim rejected by hospital."),
          adminReviewNotes: claim.admin_review_notes,
          timelineEventType: "REJECT",
          timelineNote: notes.trim() || "Claim rejected by hospital.",
        };
      }

      if (!(currentStage === "SUBMITTED_TO_AGENCY" || currentStatus === "REVIEW")) {
        throw new WorkflowError(409, "Only claims under agency review can be rejected");
      }

      return {
        newStage: "REJECTED",
        newStatus: "REJECTED",
        agentNotes: claim.agent_notes,
        hospitalNotes: claim.hospital_notes,
        adminReviewNotes: appendNote(claim.admin_review_notes, notes, "Claim rejected."),
        timelineEventType: "REJECT",
        timelineNote: notes.trim() || "Claim rejected.",
      };
    }
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const session = await requireSession();
    const { id } = await context.params;
    const claimId = claimIdSchema.parse(id);
    const { action, notes } = workflowRequestSchema.parse(await request.json());

    assertRoleAllowedForAction(session.role, action);

    await client.query("BEGIN");

    const claimResult = await client.query<AuthorizedClaim>(
      `
        SELECT
          c.claim_id,
          c.stage,
          c.status,
          c.agent_notes,
          c.hospital_notes,
          c.admin_review_notes
        FROM public.claim c
        LEFT JOIN public.client cl ON cl.client_id = c.client_id
        LEFT JOIN public.app_user agent_user ON agent_user.user_id = cl.agent_id
        WHERE c.claim_id = $1
          AND (
            $2 IN ('super_admin', 'developer')
            OR (
              $2 IN ('agent', 'agent_manager')
              AND (
                c.created_by_user_id = $3
                OR c.assigned_agent_id = $3
                OR cl.agent_id = $3
              )
            )
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
            OR (
              $2 IN ('admin_agency', 'insurance_admin')
              AND $4::uuid IS NOT NULL
              AND (
                c.agency_id = $4::uuid
                OR (c.agency_id IS NULL AND agent_user.agency_id = $4::uuid)
              )
            )
          )
        FOR UPDATE OF c
      `,
      [claimId, session.role, session.userId, session.agencyId]
    );

    if (claimResult.rows.length === 0) {
      throw new WorkflowError(404, "Claim not found");
    }

    const claim = claimResult.rows[0];
    const transition = resolveTransition({
      action,
      claim,
      role: session.role,
      notes,
    });

    const updateResult = await client.query<{
      claim_id: string;
      stage: string;
      status: string;
    }>(
      `
        UPDATE public.claim
        SET
          stage = $1,
          status = $2,
          agent_notes = $3,
          hospital_notes = $4,
          admin_review_notes = $5,
          updated_at = NOW()
        WHERE claim_id = $6
        RETURNING claim_id, stage, status
      `,
      [
        transition.newStage,
        transition.newStatus,
        transition.agentNotes,
        transition.hospitalNotes,
        transition.adminReviewNotes,
        claimId,
      ]
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
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        claimId,
        transition.timelineEventType,
        transition.newStatus,
        session.userId,
        transition.timelineNote,
        JSON.stringify({
          action,
          previousStage: claim.stage,
          newStage: transition.newStage,
          previousStatus: claim.status,
          newStatus: transition.newStatus,
          actorRole: session.role,
        }),
      ]
    );

    await client.query("COMMIT");

    await Promise.all([
      deleteCacheByPattern(`claims:agent:detail:${claimId}:*`),
      deleteCacheByPattern(`claims:hospital:detail:${claimId}`),
      deleteCacheByPattern(`claims:agent:documents:${claimId}`),
      deleteCacheByPattern(`claims:agent:info-request:${claimId}`),
      deleteCacheByPattern(`claims:hospital:pending-info-request:${claimId}`),
      deleteCacheByPattern("claims:agent:list:*"),
      deleteCacheByPattern("claims:hospital:list:*"),
    ]);

    return NextResponse.json({
      success: true,
      claim: updateResult.rows[0],
      newStage: transition.newStage,
      newStatus: transition.newStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return toErrorResponse(error);
  } finally {
    client.release();
  }
}
