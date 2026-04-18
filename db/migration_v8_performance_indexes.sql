-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v8: Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────
-- Targets the hot query paths surfaced by the dashboard cache layer:
--   • agent claims list (created_by_user_id, ORDER BY created_at DESC)
--   • hospital claims list (hospital_id, status filter)
--   • developer analytics (12-aggregate over claim, app_user, role joins)
--   • RBAC scope lookups (user_role.user_id + scope_type + scope_id)
--   • client lookups by agent_id
--   • claim_document and claim_info_request join lookups by claim_id
--
-- All indexes are CREATE INDEX CONCURRENTLY so they do NOT lock writes.
-- IMPORTANT: run each statement OUTSIDE a transaction (psql -f or one stmt
-- at a time). CONCURRENTLY cannot run inside BEGIN/COMMIT.
--
-- Idempotent via IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────────

-- Agent claim list (most-used dashboard query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_created_by_user_created_at
  ON public.claim (created_by_user_id, created_at DESC);

-- Hospital claim list (status filter is highly selective)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_hospital_status
  ON public.claim (hospital_id, status);

-- Generic claim status timeline / approval-rate aggregate
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_status_created_at
  ON public.claim (status, created_at DESC);

-- Stage-bucket aggregate used by developer analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_stage
  ON public.claim (stage);

-- Client lookup by owning agent
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_agent_id
  ON public.client (agent_id);

-- Person FK from client (fast JOINs in claim list)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_person_id
  ON public.client (person_id);

-- RBAC scope lookups (HOSPITAL/AGENCY scope authorization checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_user_scope
  ON public.user_role (user_id, scope_type, scope_id);

-- App user lookups by role/agency (developer + admin-agency dashboards)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_user_role_agency
  ON public.app_user (role, agency_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_user_status_created_at
  ON public.app_user (status, created_at DESC);

-- Claim documents lookup by claim
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_document_claim_id
  ON public.claim_document (claim_id);

-- Pending info-request gating on hospital approve flow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_info_request_claim_status
  ON public.claim_info_request (claim_id, status);

-- Claim timeline reads (audit log per claim)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_timeline_claim_created_at
  ON public.claim_timeline (claim_id, created_at DESC);

-- Auth session lookup by token (login + every getSession())
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_session_session_id
  ON public.auth_session (session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_session_user_id
  ON public.auth_session (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- After running this migration, run ANALYZE so the planner picks them up:
--   ANALYZE public.claim, public.client, public.app_user, public.user_role,
--           public.claim_document, public.claim_info_request,
--           public.claim_timeline, public.auth_session;
-- ─────────────────────────────────────────────────────────────────────────────
