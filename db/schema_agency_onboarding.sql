-- ============================================================
-- Agency onboarding: invitation tokens + audit trail
-- ============================================================
-- Design notes:
--   * No more hardcoded "Welcome123!" passwords. Every new agent
--     receives an invitation with a one-use token; they set their
--     own password on the landing page.
--   * All membership mutations get an append-only audit row so the
--     agency admin can prove who promoted/removed whom and when.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agency_invitation (
    invitation_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id           UUID NOT NULL REFERENCES public.agency(agency_id) ON DELETE CASCADE,
    email               TEXT NOT NULL,
    full_name           TEXT,
    phone_number        TEXT,
    -- Role inside the agency (master_admin | admin | manager | agent)
    agency_role         TEXT NOT NULL CHECK (agency_role IN ('master_admin', 'admin', 'manager', 'agent')),
    -- sha256 of the raw token. Raw token only shown once, right after creation.
    token_hash          TEXT NOT NULL UNIQUE,
    invited_by_user_id  UUID NOT NULL REFERENCES public.app_user(user_id),
    expires_at          TIMESTAMPTZ NOT NULL,
    accepted_at         TIMESTAMPTZ,
    accepted_user_id    UUID REFERENCES public.app_user(user_id),
    revoked_at          TIMESTAMPTZ,
    revoked_by_user_id  UUID REFERENCES public.app_user(user_id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup of pending invites for an agency
CREATE INDEX IF NOT EXISTS idx_agency_invitation_pending
    ON public.agency_invitation(agency_id, created_at DESC)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Prevent duplicate active invites per email+agency
CREATE UNIQUE INDEX IF NOT EXISTS uq_agency_invitation_active_email
    ON public.agency_invitation(agency_id, lower(email))
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ============================================================
-- Append-only audit for agency_member changes
-- ============================================================

DO $$ BEGIN
    CREATE TYPE public.agency_member_event AS ENUM (
        'invited',
        'accepted',
        'added_directly',
        'role_changed',
        'status_changed',
        'removed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.agency_member_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id       UUID NOT NULL,
    member_user_id  UUID NOT NULL,
    event_type      public.agency_member_event NOT NULL,
    from_role       TEXT,
    to_role         TEXT,
    from_status     TEXT,
    to_status       TEXT,
    by_user_id      UUID,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agency_member_audit_agency
    ON public.agency_member_audit(agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_member_audit_user
    ON public.agency_member_audit(member_user_id, created_at DESC);

-- Reject UPDATEs & DELETEs — this table is append-only.
CREATE OR REPLACE FUNCTION public.fn_agency_member_audit_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'agency_member_audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS tr_agency_member_audit_no_update ON public.agency_member_audit;
CREATE TRIGGER tr_agency_member_audit_no_update
    BEFORE UPDATE OR DELETE ON public.agency_member_audit
    FOR EACH ROW EXECUTE FUNCTION public.fn_agency_member_audit_immutable();
