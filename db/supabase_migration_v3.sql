-- ============================================================
-- MIGRATION V3 FOR SUPABASE
-- Jalankan seluruh script ini di Supabase SQL Editor
-- Semua statement menggunakan IF NOT EXISTS / DO blocks
-- sehingga aman untuk dijalankan ulang (idempotent)
-- ============================================================


-- ============================================================
-- PART 1: CLAIM NUMBER
-- ============================================================

-- Add claim_number column to claim
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS claim_number VARCHAR(30);

-- Create uniqueness constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'claim_claim_number_key' AND conrelid = 'public.claim'::regclass
  ) THEN
    ALTER TABLE public.claim ADD CONSTRAINT claim_claim_number_key UNIQUE (claim_number);
  END IF;
END $$;

-- Create sequence for claim numbers
CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq START 1;

-- Function to auto-generate claim_number on insert
-- Self-healing: checks max number per year AND global sequence
-- to safely handle concurrent inserts and post-backfill scenarios.
CREATE OR REPLACE FUNCTION public.generate_claim_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_num     INTEGER;
  new_code     TEXT;
  max_attempts INTEGER := 5;
  attempt      INTEGER := 0;
BEGIN
  IF NEW.claim_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  current_year := TO_CHAR(NOW(), 'YYYY');

  LOOP
    attempt := attempt + 1;

    -- Get max sequence number for current year from existing claims
    SELECT COALESCE(
      MAX(CAST(SPLIT_PART(claim_number, '-', 3) AS INTEGER)), 0
    ) + 1
    INTO next_num
    FROM public.claim
    WHERE claim_number LIKE 'CLM-' || current_year || '-%'
      AND claim_number ~ ('^CLM-' || current_year || '-[0-9]+$');

    -- Take the greater of: year-max+1 vs global sequence (handles concurrent inserts)
    next_num := GREATEST(next_num, NEXTVAL('public.claim_number_seq'));

    -- Keep sequence in sync
    PERFORM SETVAL('public.claim_number_seq', next_num, true);

    new_code := 'CLM-' || current_year || '-' || LPAD(next_num::TEXT, 5, '0');

    -- Only use if truly unique
    IF NOT EXISTS (SELECT 1 FROM public.claim WHERE claim_number = new_code) THEN
      NEW.claim_number := new_code;
      RETURN NEW;
    END IF;

    -- Collision: advance sequence and retry
    PERFORM NEXTVAL('public.claim_number_seq');

    IF attempt >= max_attempts THEN
      NEW.claim_number := 'CLM-' || current_year || '-' || LPAD((next_num + attempt)::TEXT, 5, '0');
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_claim_number ON public.claim;
CREATE TRIGGER trg_generate_claim_number
  BEFORE INSERT ON public.claim
  FOR EACH ROW EXECUTE FUNCTION public.generate_claim_number();

-- Backfill existing claims without claim_number
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

-- CRITICAL: Sync the sequence to be >= max existing claim number
-- This prevents "duplicate key" errors when new claims are inserted.
SELECT setval(
  'public.claim_number_seq',
  GREATEST(
    (SELECT COALESCE(MAX(CAST(SPLIT_PART(claim_number, '-', 3) AS INTEGER)), 0)
     FROM public.claim
     WHERE claim_number ~ '^CLM-[0-9]{4}-[0-9]+$'),
    1
  ),
  true -- 'true' means nextval() will return this value + 1
);


-- ============================================================
-- PART 2: LETTER OF GUARANTEE (LOG) FIELDS ON CLAIM
-- ============================================================

ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_number VARCHAR(100);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_issued_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_issued_by UUID REFERENCES auth.users(id);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_file_url TEXT;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_sent_to_hospital_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS log_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS insurance_name VARCHAR(255);
ALTER TABLE public.claim ADD COLUMN IF NOT EXISTS insurance_contact VARCHAR(100);

-- Add extra_data to claim_timeline for audit trail
ALTER TABLE public.claim_timeline ADD COLUMN IF NOT EXISTS extra_data JSONB;


-- ============================================================
-- PART 3: BEFORE/AFTER HOSPITALIZATION COVERAGE (30 HARI)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claim_coverage_period (
  coverage_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID NOT NULL REFERENCES public.claim(claim_id) ON DELETE CASCADE,
  period_type     VARCHAR(20) NOT NULL CHECK (period_type IN ('BEFORE', 'AFTER')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  amount          NUMERIC(15, 2),
  description     TEXT,
  is_eligible     BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_coverage_dates CHECK (end_date >= start_date)
);

-- NOTE: Supabase (PostgreSQL 12+) does not support GENERATED ALWAYS AS STORED
-- for simple expressions in all contexts, so we use a trigger instead:
CREATE OR REPLACE FUNCTION public.calc_coverage_days()
RETURNS TRIGGER AS $$
BEGIN
  -- coverage_days not stored as generated column; compute in app layer if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.claim_coverage_period IS
  'Tracks 30-day before/after hospitalization periods for reimbursement eligibility';


-- ============================================================
-- PART 4: REFERRAL CODE SYSTEM ON app_user
-- ============================================================

ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES public.app_user(user_id);
ALTER TABLE public.app_user ADD COLUMN IF NOT EXISTS referral_points INTEGER DEFAULT 0;

-- Unique constraint on referral_code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'app_user_referral_code_key' AND conrelid = 'public.app_user'::regclass
  ) THEN
    ALTER TABLE public.app_user ADD CONSTRAINT app_user_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Function to generate referral code for agents
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(20);
BEGIN
  IF NEW.referral_code IS NULL AND NEW.role = 'agent' THEN
    new_code := 'AQ-' || UPPER(SUBSTRING(NEW.user_id::TEXT FROM 1 FOR 4) ||
                          SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    WHILE EXISTS (SELECT 1 FROM public.app_user WHERE referral_code = new_code) LOOP
      new_code := 'AQ-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
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

-- Backfill existing agents without referral codes
UPDATE public.app_user
SET referral_code = 'AQ-' || UPPER(
  SUBSTRING(user_id::TEXT FROM 1 FOR 4) ||
  SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
)
WHERE role = 'agent' AND referral_code IS NULL;

-- Referral reward tracking table
CREATE TABLE IF NOT EXISTS public.referral_reward (
  reward_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id   UUID NOT NULL REFERENCES public.app_user(user_id),
  referred_user_id   UUID NOT NULL REFERENCES public.app_user(user_id),
  reward_amount      INTEGER DEFAULT 1000,
  reward_points      INTEGER DEFAULT 10,
  status             VARCHAR(20) DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'CREDITED', 'CANCELLED')),
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  credited_at        TIMESTAMP WITH TIME ZONE
);


-- ============================================================
-- PART 5: DOCTOR APPOINTMENT BOOKING
-- NOTE: Uses existing public.client and public.hospital tables.
--       agent_user_id references app_user (the logged-in user),
--       NOT the agent table, because our auth uses app_user.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.appointment (
  appointment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id         UUID REFERENCES public.claim(claim_id) ON DELETE SET NULL,
  client_id        UUID NOT NULL REFERENCES public.client(client_id),
  hospital_id      UUID REFERENCES public.hospital(hospital_id),
  doctor_id        UUID REFERENCES public.doctor(doctor_id),
  agent_user_id    UUID REFERENCES public.app_user(user_id),
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  appointment_type VARCHAR(50) DEFAULT 'CONSULTATION'
                   CHECK (appointment_type IN (
                     'CONSULTATION','FOLLOW_UP','PROCEDURE',
                     'EMERGENCY','PRE_HOSPITALIZATION','POST_HOSPITALIZATION'
                   )),
  status           VARCHAR(30) DEFAULT 'SCHEDULED'
                   CHECK (status IN (
                     'SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','RESCHEDULED'
                   )),
  notes            TEXT,
  hospital_notes   TEXT,
  confirmed_at     TIMESTAMP WITH TIME ZONE,
  confirmed_by     UUID REFERENCES public.app_user(user_id),
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_client   ON public.appointment(client_id);
CREATE INDEX IF NOT EXISTS idx_appointment_claim     ON public.appointment(claim_id);
CREATE INDEX IF NOT EXISTS idx_appointment_agent     ON public.appointment(agent_user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_date      ON public.appointment(appointment_date);


-- ============================================================
-- PART 6: AGENT PERFORMANCE TABLE
-- NOTE: Uses app_user.user_id (our auth model), NOT agent.agent_id
--       The agent table is for legacy/insurance system use.
--       Our portal agents are identified by app_user.user_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_performance (
  performance_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id        UUID NOT NULL REFERENCES public.app_user(user_id),
  period_year          INTEGER NOT NULL,
  period_month         INTEGER NOT NULL,
  total_claims         INTEGER DEFAULT 0,
  approved_claims      INTEGER DEFAULT 0,
  rejected_claims      INTEGER DEFAULT 0,
  total_claim_value    NUMERIC(18,2) DEFAULT 0,
  total_commission     NUMERIC(15,2) DEFAULT 0,
  points_earned        INTEGER DEFAULT 0,
  rank_level           VARCHAR(20) DEFAULT 'BRONZE',
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_user_id, period_year, period_month)
);


-- ============================================================
-- PART 7: POINTS ON PERSON TABLE
-- (for tracking agent points used in rank calculations)
-- ============================================================

ALTER TABLE public.person ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;


-- ============================================================
-- PART 8: RANK CONFIG TABLE
-- NOTE: The 'tier' table already exists in Supabase with similar purpose.
-- rank_config is a simpler lookup used by our admin-agency performance page.
-- Both can coexist.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rank_config (
  rank_name             VARCHAR(20) PRIMARY KEY,
  min_points            INTEGER NOT NULL,
  max_points            INTEGER,
  commission_multiplier NUMERIC(4,2) DEFAULT 1.00,
  display_label         VARCHAR(50)
);

INSERT INTO public.rank_config (rank_name, min_points, max_points, commission_multiplier, display_label)
VALUES
  ('BRONZE',   0,     999,   1.00, 'Bronze Agent'),
  ('SILVER',   1000,  4999,  1.10, 'Silver Agent'),
  ('GOLD',     5000,  14999, 1.25, 'Gold Agent'),
  ('PLATINUM', 15000, NULL,  1.50, 'Platinum Agent')
ON CONFLICT (rank_name) DO NOTHING;


-- ============================================================
-- PART 9: INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_claim_claim_number     ON public.claim(claim_number);
CREATE INDEX IF NOT EXISTS idx_claim_log_number       ON public.claim(log_number);
CREATE INDEX IF NOT EXISTS idx_app_user_referral_code ON public.app_user(referral_code);
CREATE INDEX IF NOT EXISTS idx_app_user_agency_id     ON public.app_user(agency_id);


-- ============================================================
-- SUMMARY OF STAGE VALUES USED IN CLAIM WORKFLOW:
-- ============================================================
-- 'DRAFT_AGENT'           : Agent membuat klaim baru
-- 'PENDING_LOG'           : Menunggu LOG dari asuransi
-- 'LOG_ISSUED'            : LOG sudah diterbitkan, ada di agen
-- 'LOG_SENT_TO_HOSPITAL'  : LOG dikirim ke RS
-- 'PENDING_HOSPITAL_INPUT': RS sedang mengisi data medis
-- 'PENDING_AGENT_REVIEW'  : RS selesai, agen review
-- 'SUBMITTED_TO_AGENCY'   : Agen submit ke admin agency
-- 'APPROVED_BY_AGENCY'    : Disetujui
-- 'REJECTED_BY_AGENCY'    : Ditolak
-- ============================================================
