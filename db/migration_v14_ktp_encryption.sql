-- migration_v14_ktp_encryption.sql
-- Adds field-level encryption columns for the KTP / NIK number on
-- public.person. The plaintext id_card column is kept for legacy rows
-- and is NOT removed in this migration — backfill via the script
-- scripts/backfill-encrypt-nik.mjs first, then drop in a follow-up.
--
-- Application-side helpers: src/lib/encryption.ts
--   - id_card_encrypted: AES-256-GCM ciphertext envelope (`v1:iv:tag:ct`)
--   - id_card_hash:      HMAC-SHA256 blind index (hex, 64 chars)
--                        used for duplicate-detection and lookups
--                        without decrypting.

BEGIN;

ALTER TABLE public.person
    ADD COLUMN IF NOT EXISTS id_card_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS id_card_hash      CHAR(64);

-- Allow legacy plaintext column to be NULL going forward
ALTER TABLE public.person
    ALTER COLUMN id_card DROP NOT NULL;

-- Blind-index lookup. Not UNIQUE because legacy clients/agents may have
-- entered the same NIK twice in different person rows; tighten to UNIQUE
-- in a follow-up migration once the data is clean.
CREATE INDEX IF NOT EXISTS person_id_card_hash_idx
    ON public.person (id_card_hash)
    WHERE id_card_hash IS NOT NULL;

COMMIT;
