-- Agency join-request flow
--
-- Complements the invitation flow (admin → invitee) with the opposite
-- direction: an agent self-registers and asks to join a specific agency.
-- The agency's admin then accepts or rejects. Accept runs the usual
-- syncAgencyMembership + flips app_user.status to ACTIVE.

CREATE TABLE IF NOT EXISTS public.agency_join_request (
    request_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id         UUID NOT NULL REFERENCES public.agency(agency_id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES public.app_user(user_id) ON DELETE CASCADE,
    message           TEXT,
    status            TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','rejected','withdrawn')),
    responded_at      TIMESTAMPTZ,
    responded_by      UUID REFERENCES public.app_user(user_id),
    response_note     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active request per (agency, user) — you can re-apply only after
-- the previous request is resolved.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_join_request_unique_pending
    ON public.agency_join_request (agency_id, requester_user_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agency_join_request_agency
    ON public.agency_join_request (agency_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agency_join_request_requester
    ON public.agency_join_request (requester_user_id, status, created_at DESC);
