-- Migration v9 — relax FK rules on columns that reference public.app_user(user_id)
--
-- Goal: allow hard-deleting a user from /developer/users without tripping
-- NO ACTION / RESTRICT violations on audit-style columns (who-did-what pointers).
--
-- Strategy:
--   * audit/nullable columns → SET NULL  (preserve history row, forget who did it)
--   * ownership rows that are meaningless without the user → CASCADE
--   * business-critical RESTRICT rules (client_request chain) → keep as-is;
--     the DELETE API catches 23503 and falls back to soft-delete.
--
-- Idempotent: drops each FK by name before recreating it.

BEGIN;

-- ── SET NULL (nullable audit pointers) ────────────────────────────────────
ALTER TABLE public.agency
  DROP CONSTRAINT IF EXISTS agency_admin_user_id_fkey,
  ADD CONSTRAINT agency_admin_user_id_fkey
    FOREIGN KEY (admin_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.agency_invitation
  DROP CONSTRAINT IF EXISTS agency_invitation_accepted_user_id_fkey,
  ADD CONSTRAINT agency_invitation_accepted_user_id_fkey
    FOREIGN KEY (accepted_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.agency_invitation
  DROP CONSTRAINT IF EXISTS agency_invitation_revoked_by_user_id_fkey,
  ADD CONSTRAINT agency_invitation_revoked_by_user_id_fkey
    FOREIGN KEY (revoked_by_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

-- agency_invitation.invited_by_user_id is NOT NULL — relax it first
ALTER TABLE public.agency_invitation
  ALTER COLUMN invited_by_user_id DROP NOT NULL;
ALTER TABLE public.agency_invitation
  DROP CONSTRAINT IF EXISTS agency_invitation_invited_by_user_id_fkey,
  ADD CONSTRAINT agency_invitation_invited_by_user_id_fkey
    FOREIGN KEY (invited_by_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.agency_join_request
  DROP CONSTRAINT IF EXISTS agency_join_request_responded_by_fkey,
  ADD CONSTRAINT agency_join_request_responded_by_fkey
    FOREIGN KEY (responded_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.agency_member
  DROP CONSTRAINT IF EXISTS agency_member_invited_by_fkey,
  ADD CONSTRAINT agency_member_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.agency_transfer_request
  DROP CONSTRAINT IF EXISTS agency_transfer_request_reviewed_by_fkey,
  ADD CONSTRAINT agency_transfer_request_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.app_user
  DROP CONSTRAINT IF EXISTS app_user_referred_by_user_id_fkey,
  ADD CONSTRAINT app_user_referred_by_user_id_fkey
    FOREIGN KEY (referred_by_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.appointment
  DROP CONSTRAINT IF EXISTS appointment_agent_user_id_fkey,
  ADD CONSTRAINT appointment_agent_user_id_fkey
    FOREIGN KEY (agent_user_id) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.appointment
  DROP CONSTRAINT IF EXISTS appointment_confirmed_by_fkey,
  ADD CONSTRAINT appointment_confirmed_by_fkey
    FOREIGN KEY (confirmed_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

ALTER TABLE public.claim
  DROP CONSTRAINT IF EXISTS claim_log_issued_by_fkey,
  ADD CONSTRAINT claim_log_issued_by_fkey
    FOREIGN KEY (log_issued_by) REFERENCES public.app_user(user_id) ON DELETE SET NULL;

-- ── CASCADE (rows that don't make sense without the user) ────────────────
ALTER TABLE public.agency_transfer_request
  DROP CONSTRAINT IF EXISTS agency_transfer_request_agent_id_fkey,
  ADD CONSTRAINT agency_transfer_request_agent_id_fkey
    FOREIGN KEY (agent_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;

ALTER TABLE public.agent_performance
  DROP CONSTRAINT IF EXISTS agent_performance_agent_user_id_fkey,
  ADD CONSTRAINT agent_performance_agent_user_id_fkey
    FOREIGN KEY (agent_user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;

ALTER TABLE public.referral_reward
  DROP CONSTRAINT IF EXISTS referral_reward_referred_user_id_fkey,
  ADD CONSTRAINT referral_reward_referred_user_id_fkey
    FOREIGN KEY (referred_user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;

ALTER TABLE public.referral_reward
  DROP CONSTRAINT IF EXISTS referral_reward_referrer_user_id_fkey,
  ADD CONSTRAINT referral_reward_referrer_user_id_fkey
    FOREIGN KEY (referrer_user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;

ALTER TABLE public.user_person_link
  DROP CONSTRAINT IF EXISTS user_person_link_user_id_fkey,
  ADD CONSTRAINT user_person_link_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_user(user_id) ON DELETE CASCADE;

-- ── INTENTIONALLY KEPT AS RESTRICT ────────────────────────────────────────
-- client_request.agent_id                       (business ownership)
-- client_request_message.sender_user_id         (message authorship)
-- client_request_status_change.changed_by_user_id (audit trail integrity)
-- Handled in code: DELETE /api/users/[id] catches PG 23503 and falls back
-- to soft-delete (status='SUSPENDED', sessions revoked, email rotated).

COMMIT;
