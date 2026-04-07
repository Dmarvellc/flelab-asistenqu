-- ============================================================
-- MIGRATION V4: HOSPITAL NETWORK INTELLIGENCE SYSTEM
-- Enhanced hospital & doctor data for MY/SG integration
-- Idempotent — safe to re-run
-- ============================================================

-- ── 1. Enhance hospital table ──────────────────────────────
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'STANDARD';
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS bed_count INTEGER;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS established_year INTEGER;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7);
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7);
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS operating_hours TEXT;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS emergency_24h BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS international_patients BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS insurance_panel BOOLEAN DEFAULT FALSE;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS specializations TEXT[];
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS accreditations TEXT[];
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS languages_supported TEXT[];
ALTER TABLE public.hospital ADD COLUMN IF NOT EXISTS technologies TEXT[];

-- ── 2. Enhance doctors table ───────────────────────────────
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS qualifications TEXT[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS procedures_offered TEXT[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS conditions_treated TEXT[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS available_days TEXT[];
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS accepting_new_patients BOOLEAN DEFAULT TRUE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS telemedicine_available BOOLEAN DEFAULT FALSE;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospital(hospital_id);

-- ── 3. Hospital facilities table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.hospital_facility (
  facility_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES public.hospital(hospital_id) ON DELETE CASCADE,
  category      VARCHAR(50) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  is_highlighted BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_facility_hospital ON public.hospital_facility(hospital_id);

-- ── 4. Hospital-insurance partnership table ─────────────────
CREATE TABLE IF NOT EXISTS public.hospital_insurance_panel (
  panel_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES public.hospital(hospital_id) ON DELETE CASCADE,
  insurance_name VARCHAR(200) NOT NULL,
  panel_type    VARCHAR(50) DEFAULT 'CASHLESS',
  coverage_notes TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hospital_insurance_hospital ON public.hospital_insurance_panel(hospital_id);

-- ── 5. Indexes for search ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hospital_country ON public.hospital(country);
CREATE INDEX IF NOT EXISTS idx_hospital_city ON public.hospital(city);
CREATE INDEX IF NOT EXISTS idx_hospital_tier ON public.hospital(tier);
CREATE INDEX IF NOT EXISTS idx_hospital_partner ON public.hospital(is_partner);
CREATE INDEX IF NOT EXISTS idx_doctors_country ON public.doctors(country);
CREATE INDEX IF NOT EXISTS idx_doctors_spec ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors(hospital_id);
