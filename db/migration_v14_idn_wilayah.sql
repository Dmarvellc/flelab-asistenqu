-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v14: Indonesia wilayah (province → village) reference tables
--
-- Populate with:  pnpm db:seed-wilayah
-- Uses BPS Kemendagri-format codes aligned with npm package idn-area-data.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.idn_province (
  code  text PRIMARY KEY,
  name  text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.idn_regency (
  code          text PRIMARY KEY,
  province_code text NOT NULL REFERENCES public.idn_province (code) ON DELETE CASCADE,
  name          text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.idn_district (
  code          text PRIMARY KEY,
  regency_code  text NOT NULL REFERENCES public.idn_regency (code) ON DELETE CASCADE,
  name          text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.idn_village (
  code           text PRIMARY KEY,
  district_code  text NOT NULL REFERENCES public.idn_district (code) ON DELETE CASCADE,
  name           text NOT NULL
);

CREATE INDEX IF NOT EXISTS idn_regency_province_idx
  ON public.idn_regency (province_code);
CREATE INDEX IF NOT EXISTS idn_district_regency_idx
  ON public.idn_district (regency_code);
CREATE INDEX IF NOT EXISTS idn_village_district_idx
  ON public.idn_village (district_code);
