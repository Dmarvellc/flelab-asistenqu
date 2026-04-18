-- ============================================================================
-- Migration v7: System Log & Observability
-- ============================================================================
-- Central table for persisted errors, warnings, and critical system events.
-- Feeds the Developer Console "Critical Alerts" panel and error analytics.
--
-- Design notes:
--   * `level` is a cheap text check (not an enum) so we can add levels without
--     an ALTER TYPE dance.
--   * `is_public_facing` = TRUE means the error was triggered by a public user
--     request path (/agent, /hospital, /status) — these are the ones devs must
--     see immediately. Internal/background job errors stay in the log but do
--     not raise a banner.
--   * `fingerprint` allows de-duplication: repeated identical errors bump the
--     `occurrences` counter instead of bloating the table.
--   * Indexed heavily on (created_at DESC) because the Developer Console reads
--     "last N hours" slices constantly.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_log (
  log_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  level             TEXT         NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
  scope             TEXT         NOT NULL,                      -- e.g. 'api.agent.claims.list'
  message           TEXT         NOT NULL,
  error_name        TEXT,
  error_stack       TEXT,
  user_id           UUID,
  request_path      TEXT,
  request_method    TEXT,
  meta              JSONB,
  fingerprint       TEXT,                                       -- hash(scope + error_name + message)
  occurrences       INTEGER      NOT NULL DEFAULT 1,
  is_public_facing  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_acknowledged   BOOLEAN      NOT NULL DEFAULT FALSE,
  acknowledged_at   TIMESTAMPTZ,
  acknowledged_by   UUID,
  first_seen_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_log_created
  ON public.system_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_log_level_created
  ON public.system_log (level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_log_scope
  ON public.system_log (scope, created_at DESC);

-- Partial index for the Critical Alerts banner — stays small and fast.
CREATE INDEX IF NOT EXISTS idx_system_log_critical_unack
  ON public.system_log (last_seen_at DESC)
  WHERE level IN ('error', 'critical')
    AND is_public_facing = TRUE
    AND is_acknowledged  = FALSE;

-- De-dup lookup (upsert by fingerprint within a rolling window).
CREATE INDEX IF NOT EXISTS idx_system_log_fingerprint
  ON public.system_log (fingerprint, last_seen_at DESC)
  WHERE fingerprint IS NOT NULL;

-- Optional retention helper: drop logs older than 30 days except critical+unacked.
-- Run manually or via a cron job; not a trigger so we don't silently lose data.
-- DELETE FROM public.system_log
-- WHERE created_at < NOW() - INTERVAL '30 days'
--   AND NOT (level = 'critical' AND is_acknowledged = FALSE);
