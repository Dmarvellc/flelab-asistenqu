-- ============================================================
-- MIGRATION V6: AGENCY ECOSYSTEM — Branding, Team, Permissions
-- Idempotent — safe to re-run
-- ============================================================

-- ── 1. Enhance agency table with branding + slug ─────────
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS primary_color VARCHAR(9) DEFAULT '#111827';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(9) DEFAULT '#374151';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS accent_color VARCHAR(9) DEFAULT '#3B82F6';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS sidebar_bg VARCHAR(9) DEFAULT '#FFFFFF';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS sidebar_text VARCHAR(9) DEFAULT '#111827';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS login_bg VARCHAR(9) DEFAULT '#F9FAFB';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE public.agency ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique index on slug (partial — only non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_slug ON public.agency(slug) WHERE slug IS NOT NULL;

-- ── 2. Backfill slugs from existing agency names ─────────
UPDATE public.agency
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL AND name IS NOT NULL;

-- ── 3. Agency member table (team management) ─────────────
CREATE TABLE IF NOT EXISTS public.agency_member (
  member_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES public.agency(agency_id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.app_user(user_id) ON DELETE CASCADE,
  role          VARCHAR(30) NOT NULL DEFAULT 'agent',
  -- Roles: 'master_admin', 'admin', 'manager', 'agent'
  permissions   JSONB DEFAULT '[]'::jsonb,
  -- Granular permission overrides (array of permission keys)
  invited_by    UUID REFERENCES public.app_user(user_id),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  status        VARCHAR(20) DEFAULT 'ACTIVE',
  -- Status: 'ACTIVE', 'INVITED', 'SUSPENDED'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_member_agency ON public.agency_member(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_member_user ON public.agency_member(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_member_role ON public.agency_member(role);

-- ── 4. Backfill agency_member from existing agents ───────
-- For admin_agency users: create as master_admin
INSERT INTO public.agency_member (agency_id, user_id, role, status)
SELECT u.agency_id, u.user_id, 'master_admin', 'ACTIVE'
FROM public.app_user u
WHERE u.agency_id IS NOT NULL
  AND u.role IN ('admin_agency', 'insurance_admin')
  AND NOT EXISTS (
    SELECT 1 FROM public.agency_member m WHERE m.user_id = u.user_id AND m.agency_id = u.agency_id
  );

-- For agent users: create as agent
INSERT INTO public.agency_member (agency_id, user_id, role, status)
SELECT u.agency_id, u.user_id, 'agent', u.status
FROM public.app_user u
WHERE u.agency_id IS NOT NULL
  AND u.role IN ('agent', 'agent_manager')
  AND NOT EXISTS (
    SELECT 1 FROM public.agency_member m WHERE m.user_id = u.user_id AND m.agency_id = u.agency_id
  );

-- ── 5. Default role permissions template ─────────────────
CREATE TABLE IF NOT EXISTS public.agency_role_template (
  template_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES public.agency(agency_id) ON DELETE CASCADE,
  role_name     VARCHAR(30) NOT NULL,
  permissions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Array of permission key strings
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_agency_role_template_agency ON public.agency_role_template(agency_id);
