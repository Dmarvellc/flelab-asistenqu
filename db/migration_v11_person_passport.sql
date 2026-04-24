-- Migration v11: Add passport_number to person
-- Many insurance claims (esp. international benefits) require passport as
-- secondary/alternate ID. Agents kept asking for this field.

BEGIN;

ALTER TABLE public.person
    ADD COLUMN IF NOT EXISTS passport_number varchar(30);

-- Non-unique because a person may not have one, and country codes differ.
CREATE INDEX IF NOT EXISTS idx_person_passport_number
    ON public.person (passport_number)
    WHERE passport_number IS NOT NULL;

COMMIT;
