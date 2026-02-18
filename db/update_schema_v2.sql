-- 1. Create Agency Table
CREATE TABLE IF NOT EXISTS public.agency (
  agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  admin_user_id UUID REFERENCES public.app_user(user_id), -- The admin managing this agency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add agency_id to app_user to link agents to agencies
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agency(agency_id);

-- 3. Create Transfer Requests Table
CREATE TABLE IF NOT EXISTS public.agency_transfer_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.app_user(user_id) NOT NULL,
  from_agency_id UUID REFERENCES public.agency(agency_id),
  to_agency_id UUID REFERENCES public.agency(agency_id) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  request_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.app_user(user_id)
);

-- 4. Enhance Claim Table for Collaborative Workflow
-- We'll use a text column for stage to be flexible, but application logic will enforce enum-like behavior.
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS stage VARCHAR(50) DEFAULT 'DRAFT';
-- Proposed Stages:
-- 'DRAFT': Initial draft
-- 'PENDING_HOSPITAL_INPUT': Agent started, waiting for Hospital to add medical data
-- 'PENDING_AGENT_REVIEW': Hospital added data, Agent needs to verify/sign off
-- 'SUBMITTED_TO_AGENCY': Both parties agreed, sent to Agency Admin
-- 'APPROVED': Agency approved
-- 'REJECTED': Agency rejected

ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS agent_notes TEXT;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS hospital_notes TEXT;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS admin_review_notes TEXT;

-- Tracks who needs to act next
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS required_action_by_role VARCHAR(50); -- 'agent', 'hospital', 'admin_agency', NULL

-- Seed some initial agencies if none exist (Mock Data)
INSERT INTO public.agency (name, address)
SELECT 'Alpha Agency', 'Jakarta Selatan'
WHERE NOT EXISTS (SELECT 1 FROM public.agency WHERE name = 'Alpha Agency');

INSERT INTO public.agency (name, address)
SELECT 'Beta Agency', 'Surabaya'
WHERE NOT EXISTS (SELECT 1 FROM public.agency WHERE name = 'Beta Agency');
