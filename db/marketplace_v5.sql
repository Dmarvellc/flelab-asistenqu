-- ============================================================
-- MIGRATION V5: DOCTOR MARKETPLACE — Multi-Hospital Practice + Schedules
-- Idempotent — safe to re-run
-- ============================================================

-- ── 1. Doctor-Hospital practice link (many-to-many) ────────
-- A doctor can practice at MULTIPLE hospitals
CREATE TABLE IF NOT EXISTS public.doctor_hospital (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospital(hospital_id) ON DELETE CASCADE,
  is_primary    BOOLEAN DEFAULT FALSE,
  consultation_fee_min INTEGER,
  consultation_fee_max INTEGER,
  currency      VARCHAR(10),
  room_number   VARCHAR(50),
  floor         VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_hospital_doctor ON public.doctor_hospital(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_hospital_hospital ON public.doctor_hospital(hospital_id);

-- ── 2. Doctor schedule (per hospital) ──────────────────────
CREATE TABLE IF NOT EXISTS public.doctor_schedule (
  schedule_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES public.hospital(hospital_id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  max_patients  INTEGER DEFAULT 20,
  is_active     BOOLEAN DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_schedule_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_doctor ON public.doctor_schedule(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_hospital ON public.doctor_schedule(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedule_day ON public.doctor_schedule(day_of_week);

-- ── 3. Enrich doctors table ────────────────────────────────
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS patients_treated INTEGER DEFAULT 0;
