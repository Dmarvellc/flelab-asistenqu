-- ============================================================
-- Migration V3: Meeting Notes Implementation
-- Features:
-- 1. Claim Number (readable primary key suffix)
-- 2. Letter of Guarantee (LOG) flow
-- 3. Before/After Hospitalization Coverage (30 days)
-- 4. Referral Code System
-- 5. Doctor Appointment Booking
-- 6. Agent Performance Tracking
-- ============================================================

-- 1. Add claim_number to claim table (readable like CLM-2026-00001)
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS claim_number VARCHAR(30) UNIQUE;

-- Create sequence for claim numbers if not exists
CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq START 1;

-- Function to auto-generate claim_number on insert
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL THEN
    NEW.claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.claim_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_claim_number ON public.claim;
CREATE TRIGGER trg_generate_claim_number
  BEFORE INSERT ON public.claim
  FOR EACH ROW EXECUTE FUNCTION public.generate_claim_number();

-- Update existing claims that have no claim_number
DO $$
DECLARE
  r RECORD;
  seq_val INTEGER := 1;
BEGIN
  FOR r IN (SELECT claim_id, created_at FROM public.claim WHERE claim_number IS NULL ORDER BY created_at) LOOP
    UPDATE public.claim
    SET claim_number = 'CLM-' || TO_CHAR(r.created_at, 'YYYY') || '-' || LPAD(seq_val::TEXT, 5, '0')
    WHERE claim_id = r.claim_id AND claim_number IS NULL;
    seq_val := seq_val + 1;
  END LOOP;
END $$;

-- 2. Letter of Guarantee (LOG) support
-- Add LOG fields to claim table
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_number VARCHAR(100);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_issued_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_issued_by UUID REFERENCES public.app_user(user_id);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_file_url TEXT;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_sent_to_hospital_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS insurance_name VARCHAR(255);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS insurance_contact VARCHAR(100);

-- New stage values for LOG flow:
-- 'DRAFT_AGENT'           : Agent creates initial claim
-- 'PENDING_LOG'           : Waiting for LOG from insurance (agent sent to insurance)
-- 'LOG_ISSUED'            : Insurance issued LOG, agent has it
-- 'LOG_SENT_TO_HOSPITAL'  : Agent sent LOG to hospital
-- 'PENDING_HOSPITAL_INPUT': Hospital filling in medical data
-- 'PENDING_AGENT_REVIEW'  : Hospital done, agent reviewing
-- 'SUBMITTED_TO_AGENCY'   : Agent submitted to admin agency
-- 'APPROVED_BY_AGENCY'    : Approved
-- 'REJECTED_BY_AGENCY'    : Rejected

-- 3. Before/After Hospitalization Coverage
CREATE TABLE IF NOT EXISTS public.claim_coverage_period (
  coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claim(claim_id) ON DELETE CASCADE,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('BEFORE', 'AFTER')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  coverage_days INTEGER GENERATED ALWAYS AS (end_date - start_date) STORED,
  amount NUMERIC(15, 2),
  description TEXT,
  is_eligible BOOLEAN DEFAULT TRUE, -- eligible only if ends in hospitalization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_coverage_days CHECK (end_date >= start_date)
);

COMMENT ON TABLE public.claim_coverage_period IS 
  'Tracks 30-day before/after hospitalization periods for reimbursement eligibility';

-- 4. Referral Code System
-- Add referral_code to app_user
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES public.app_user(user_id);
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

-- Function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
  base_code VARCHAR(8);
BEGIN
  IF NEW.referral_code IS NULL AND NEW.role = 'agent' THEN
    -- Use first 4 chars of UUID + 4 random chars
    base_code := UPPER(SUBSTRING(NEW.user_id::TEXT FROM 1 FOR 4) || 
                       SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    new_code := 'AQ-' || base_code;
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.app_user WHERE referral_code = new_code) LOOP
      base_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
      new_code := 'AQ-' || base_code;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.app_user;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.app_user
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Generate referral codes for existing agents without one
UPDATE public.app_user
SET referral_code = 'AQ-' || UPPER(SUBSTRING(user_id::TEXT FROM 1 FOR 4) || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4))
WHERE role = 'agent' AND referral_code IS NULL;

-- Referral reward tracking
CREATE TABLE IF NOT EXISTS public.referral_reward (
  reward_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.app_user(user_id),
  referred_user_id UUID NOT NULL REFERENCES public.app_user(user_id),
  reward_amount INTEGER DEFAULT 1000, -- in Rupiah
  reward_points INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CREDITED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credited_at TIMESTAMP WITH TIME ZONE
);

-- 5. Doctor Appointment Booking
CREATE TABLE IF NOT EXISTS public.appointment (
  appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claim(claim_id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.client(client_id),
  hospital_id UUID REFERENCES public.hospital(hospital_id),
  doctor_id UUID, -- references doctor if we have a doctor table
  agent_user_id UUID REFERENCES public.app_user(user_id),
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  appointment_type VARCHAR(50) DEFAULT 'CONSULTATION' CHECK (
    appointment_type IN ('CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'EMERGENCY', 'PRE_HOSPITALIZATION', 'POST_HOSPITALIZATION')
  ),
  status VARCHAR(30) DEFAULT 'SCHEDULED' CHECK (
    status IN ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED')
  ),
  notes TEXT,
  hospital_notes TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES public.app_user(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_client ON public.appointment(client_id);
CREATE INDEX IF NOT EXISTS idx_appointment_claim ON public.appointment(claim_id);
CREATE INDEX IF NOT EXISTS idx_appointment_agent ON public.appointment(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON public.appointment(appointment_date);

-- 6. Agent Performance Tracking (points system enhanced)
-- Add points columns to agent or person table
CREATE TABLE IF NOT EXISTS public.agent_performance (
  performance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id UUID NOT NULL REFERENCES public.app_user(user_id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  total_claims INTEGER DEFAULT 0,
  approved_claims INTEGER DEFAULT 0,
  rejected_claims INTEGER DEFAULT 0,
  total_claim_value NUMERIC(18,2) DEFAULT 0,
  total_commission NUMERIC(15,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  rank_level VARCHAR(20) DEFAULT 'BRONZE',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_user_id, period_year, period_month)
);

-- Add points column to agent/person if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'person' AND column_name = 'points'
  ) THEN
    ALTER TABLE public.person ADD COLUMN points INTEGER DEFAULT 0;
  END IF;
END $$;

-- Rank levels based on points:
-- BRONZE: 0-999
-- SILVER: 1000-4999
-- GOLD: 5000-14999
-- PLATINUM: 15000+

-- Points multiplier per rank (stored in a config table)
CREATE TABLE IF NOT EXISTS public.rank_config (
  rank_name VARCHAR(20) PRIMARY KEY,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  commission_multiplier NUMERIC(4,2) DEFAULT 1.00,
  display_label VARCHAR(50)
);

INSERT INTO public.rank_config (rank_name, min_points, max_points, commission_multiplier, display_label)
VALUES 
  ('BRONZE', 0, 999, 1.00, 'Bronze Agent'),
  ('SILVER', 1000, 4999, 1.10, 'Silver Agent'),
  ('GOLD', 5000, 14999, 1.25, 'Gold Agent'),
  ('PLATINUM', 15000, NULL, 1.50, 'Platinum Agent')
ON CONFLICT (rank_name) DO NOTHING;

-- Add LOG fields to claim_timeline for audit trail
ALTER TABLE public.claim_timeline ADD COLUMN IF NOT EXISTS extra_data JSONB;
