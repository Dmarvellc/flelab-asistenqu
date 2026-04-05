CREATE TABLE IF NOT EXISTS public.auth_session (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_user(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  user_status TEXT NOT NULL,
  portal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_session_user_id
  ON public.auth_session (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_session_active
  ON public.auth_session (user_id, revoked, expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_session_expires_at
  ON public.auth_session (expires_at);

COMMENT ON TABLE public.auth_session IS
  'Opaque server-side sessions mirrored in Redis and PostgreSQL.';
