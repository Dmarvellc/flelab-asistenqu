/**
 * Stages where hospital may verify, request info, or return claim to agent
 * — must align with {@link hospitalWorkflowStages} in `/api/claims/[id]/workflow`.
 */
export const HOSPITAL_REVIEW_FLOW_STAGES = new Set([
  "PENDING_HOSPITAL",
  "DRAFT_HOSPITAL",
  "PENDING_HOSPITAL_INPUT",
]);

export function claimShowsHospitalVerificationActions(claim: {
  status: string;
  stage: string | null;
}): boolean {
  if (["SUBMITTED", "INFO_REQUESTED", "INFO_SUBMITTED"].includes(claim.status)) {
    return true;
  }
  return (
    claim.status === "IN_PROGRESS" &&
    !!claim.stage &&
    HOSPITAL_REVIEW_FLOW_STAGES.has(claim.stage)
  );
}
