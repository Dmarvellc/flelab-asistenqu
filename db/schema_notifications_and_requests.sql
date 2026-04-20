-- ============================================================================
--  NOTIFICATION + CLIENT REQUEST SCHEMA
--  No migration trail — designed to be applied to a freshly-cloned DB.
--
--  Two concerns, one file:
--    1. Generic notification system (in-app + WhatsApp)
--    2. Client request workflow (agent → hospital, append-only audit trail)
--
--  Apply order:  notification tables → request tables → indexes
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 0. ENUMS
-- ──────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE notif_event_type AS ENUM (
    -- Client request lifecycle
    'client_request.created',
    'client_request.approved',
    'client_request.rejected',
    'client_request.message',
    -- Claim lifecycle
    'claim.submitted',
    'claim.info_requested',
    'claim.approved',
    'claim.rejected',
    -- Generic
    'system.alert'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_channel AS ENUM ('in_app', 'whatsapp');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_delivery_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_request_type AS ENUM (
    'room_upgrade',
    'room_downgrade',
    'transfer_room',
    'extend_stay',
    'early_discharge',
    'add_treatment',
    'add_medication',
    'request_specialist',
    'request_doctor_change',
    'change_payment_method',
    'request_medical_record',
    'transfer_hospital',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE requested_by_relation AS ENUM ('client_self', 'family', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. NOTIFICATION CORE
-- ──────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS notification_delivery CASCADE;
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS notification_pref CASCADE;
DROP TABLE IF EXISTS whatsapp_outbox CASCADE;

CREATE TABLE notification (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  event_type   notif_event_type NOT NULL,
  title        text NOT NULL,
  body         text,
  link         text,                         -- /hospital/patients/{id}#requests
  meta         jsonb DEFAULT '{}'::jsonb,    -- arbitrary payload
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_delivery (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notification(id) ON DELETE CASCADE,
  channel         notif_channel NOT NULL,
  status          notif_delivery_status NOT NULL DEFAULT 'pending',
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Per-user channel preferences. Defaults to in_app ON, whatsapp OFF if no row.
CREATE TABLE notification_pref (
  user_id     uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  event_type  notif_event_type NOT NULL,
  in_app      boolean NOT NULL DEFAULT true,
  whatsapp    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, event_type)
);

-- Outbox for async WhatsApp send (cron/worker drains this)
CREATE TABLE whatsapp_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notification(id) ON DELETE SET NULL,
  to_phone        text NOT NULL,
  body            text NOT NULL,
  status          notif_delivery_status NOT NULL DEFAULT 'pending',
  attempts        int NOT NULL DEFAULT 0,
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Hot-path indexes
CREATE INDEX idx_notification_user_unread
  ON notification (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notification_user_all
  ON notification (user_id, created_at DESC);

CREATE INDEX idx_notif_delivery_pending
  ON notification_delivery (channel, status)
  WHERE status = 'pending';

CREATE INDEX idx_whatsapp_outbox_pending
  ON whatsapp_outbox (status, created_at)
  WHERE status = 'pending';

-- ──────────────────────────────────────────────────────────────────────────
-- 2. CLIENT REQUEST (agent → hospital workflow)
--    Append-only header + status_change audit trail.
-- ──────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS client_request_message CASCADE;
DROP TABLE IF EXISTS client_request_status_change CASCADE;
DROP TABLE IF EXISTS client_request CASCADE;

CREATE TABLE client_request (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL REFERENCES client(client_id) ON DELETE CASCADE,
  hospital_id              uuid NOT NULL REFERENCES hospital(hospital_id) ON DELETE CASCADE,
  agent_id                 uuid NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  claim_id                 uuid REFERENCES claim(claim_id) ON DELETE SET NULL,

  request_type             client_request_type NOT NULL,
  -- Free-form structured payload, e.g. { "from_class": "STANDARD", "to_class": "VIP" }
  payload                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes                    text,                            -- agent's note

  -- Per audio: who actually asked the agent to make this request?
  requested_by_relation    requested_by_relation NOT NULL DEFAULT 'unknown',
  requested_by_name        text,                            -- "Bu Sari (istri)"

  status                   client_request_status NOT NULL DEFAULT 'pending',

  -- Last decision (denormalized for fast list queries; full trail in status_change)
  decided_at               timestamptz,
  decided_by_user_id       uuid REFERENCES app_user(user_id) ON DELETE SET NULL,
  decided_reason           text,

  created_at               timestamptz NOT NULL DEFAULT now()
);

-- Append-only audit trail. NEVER UPDATE/DELETE these rows.
CREATE TABLE client_request_status_change (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id   uuid NOT NULL REFERENCES client_request(id) ON DELETE CASCADE,
  from_status         client_request_status,
  to_status           client_request_status NOT NULL,
  changed_by_user_id  uuid NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Free-text messages between agent and hospital on a specific request.
-- Also append-only.
CREATE TABLE client_request_message (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id   uuid NOT NULL REFERENCES client_request(id) ON DELETE CASCADE,
  sender_user_id      uuid NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  body                text NOT NULL,
  attachment_url      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_request_hospital_status_created
  ON client_request (hospital_id, status, created_at DESC);
CREATE INDEX idx_client_request_agent_created
  ON client_request (agent_id, created_at DESC);
CREATE INDEX idx_client_request_client_created
  ON client_request (client_id, created_at DESC);
CREATE INDEX idx_client_request_message_request
  ON client_request_message (client_request_id, created_at);
CREATE INDEX idx_client_request_status_change_request
  ON client_request_status_change (client_request_id, created_at);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. TRIGGER: write status_change row on every status transition
--    Keeps audit trail complete even if app code forgets.
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_client_request_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO client_request_status_change
      (client_request_id, from_status, to_status, changed_by_user_id, reason)
    VALUES
      (NEW.id, NULL, NEW.status, NEW.agent_id, 'created');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO client_request_status_change
      (client_request_id, from_status, to_status, changed_by_user_id, reason)
    VALUES
      (NEW.id, OLD.status, NEW.status,
       COALESCE(NEW.decided_by_user_id, NEW.agent_id),
       NEW.decided_reason);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_client_request_audit ON client_request;
CREATE TRIGGER tr_client_request_audit
  AFTER INSERT OR UPDATE OF status ON client_request
  FOR EACH ROW EXECUTE FUNCTION fn_client_request_audit();
