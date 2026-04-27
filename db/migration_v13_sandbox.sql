-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v13: Developer Sandbox Sessions
-- Creates sandbox_session table and adds sandbox columns to app_user.
-- Run once against your database before using the sandbox feature.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Sandbox session registry
CREATE TABLE IF NOT EXISTS public.sandbox_session (
  session_id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  description       text,
  created_by        uuid,                        -- developer user_id (soft ref, no FK so deletes don't cascade)
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  destroyed_at      timestamptz,
  status            text        NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | EXPIRED | DESTROYED
  accounts          jsonb       NOT NULL DEFAULT '[]',     -- [{role, email, password, user_id, ...}]
  metadata          jsonb       NOT NULL DEFAULT '{}'      -- {agency_id, hospital_id, ...}
);

CREATE INDEX IF NOT EXISTS sandbox_session_status_idx ON public.sandbox_session (status);
CREATE INDEX IF NOT EXISTS sandbox_session_created_at_idx ON public.sandbox_session (created_at DESC);

-- 2. Tag app_user rows that belong to a sandbox
ALTER TABLE public.app_user
  ADD COLUMN IF NOT EXISTS is_sandbox          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sandbox_session_id  uuid;

-- Soft FK — no CASCADE so we control deletion order in application code
-- ALTER TABLE public.app_user
--   ADD CONSTRAINT fk_sandbox_session FOREIGN KEY (sandbox_session_id)
--   REFERENCES public.sandbox_session(session_id);

CREATE INDEX IF NOT EXISTS app_user_sandbox_session_idx ON public.app_user (sandbox_session_id)
  WHERE sandbox_session_id IS NOT NULL;

-- 3. Auto-expire sessions via a simple check (application polls; no pg_cron needed)
-- Sessions older than expires_at are marked EXPIRED by the GET endpoint.
