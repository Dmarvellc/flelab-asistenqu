/**
 * Stages where hospital may verify, request info, or return claim to agent
 * — must align with {@link hospitalWorkflowStages} in `/api/claims/[id]/workflow`.
 */
export const HOSPITAL_REVIEW_FLOW_STAGES = new Set([
  "PENDING_HOSPITAL",
  "DRAFT_HOSPITAL",
  "PENDING_HOSPITAL_INPUT",
]);

/** Workflow stages where agent is expected to act — RS should not see hospital verification toolbar. */
export const CLAIM_STAGES_PRIMARY_AGENT_WORK = new Set(["PENDING_AGENT", "PENDING_AGENT_REVIEW"]);

export function claimShowsHospitalVerificationActions(claim: {
  status: string;
  stage: string | null;
}): boolean {
  if (claim.status === "INFO_REQUESTED" || claim.status === "INFO_SUBMITTED") {
    return true;
  }
  if (claim.status !== "SUBMITTED") {
    return false;
  }
  if (claim.stage && CLAIM_STAGES_PRIMARY_AGENT_WORK.has(claim.stage)) {
    return false;
  }
  return true;
}
