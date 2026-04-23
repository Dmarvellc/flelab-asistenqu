-- Migration v10: Expand policy detail model
-- Adds full policy management fields (due date tracking, grace period,
-- coverage, benefits, autodebet validity) plus beneficiary & rider tables.

BEGIN;

-- ─── contract ────────────────────────────────────────────────────
ALTER TABLE public.contract
    ADD COLUMN IF NOT EXISTS policy_type          varchar(40),
    ADD COLUMN IF NOT EXISTS policy_status        varchar(30)  DEFAULT 'AKTIF',
    ADD COLUMN IF NOT EXISTS underwriting_status  varchar(30)  DEFAULT 'STANDARD',
    ADD COLUMN IF NOT EXISTS issue_date           date,
    ADD COLUMN IF NOT EXISTS next_due_date        date,
    ADD COLUMN IF NOT EXISTS due_day              smallint,
    ADD COLUMN IF NOT EXISTS grace_period_days    smallint     DEFAULT 30,
    ADD COLUMN IF NOT EXISTS reinstatement_period smallint     DEFAULT 24,
    ADD COLUMN IF NOT EXISTS policy_term_years    smallint,
    ADD COLUMN IF NOT EXISTS premium_payment_term smallint,
    ADD COLUMN IF NOT EXISTS currency             varchar(5)   DEFAULT 'IDR';

-- ─── contract_detail ────────────────────────────────────────────
ALTER TABLE public.contract_detail
    ADD COLUMN IF NOT EXISTS premium_frequency    varchar(20)  DEFAULT 'MONTHLY',
    ADD COLUMN IF NOT EXISTS coverage_area        varchar(40)  DEFAULT 'INDONESIA',
    ADD COLUMN IF NOT EXISTS room_plan            varchar(80),
    ADD COLUMN IF NOT EXISTS annual_limit         numeric(18,2),
    ADD COLUMN IF NOT EXISTS lifetime_limit       numeric(18,2),
    ADD COLUMN IF NOT EXISTS deductible           numeric(18,2),
    ADD COLUMN IF NOT EXISTS coinsurance_pct      numeric(5,2),
    ADD COLUMN IF NOT EXISTS waiting_period_days  smallint     DEFAULT 30,
    ADD COLUMN IF NOT EXISTS pre_existing_covered varchar(20)  DEFAULT 'NO',
    ADD COLUMN IF NOT EXISTS cashless_network     varchar(120),
    -- Manfaat (semua nominal)
    ADD COLUMN IF NOT EXISTS benefit_life              numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_accidental_death  numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_disability        numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_critical          numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_hospitalization   numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_icu               numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_surgery           numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_outpatient        numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_daily_cash        numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_maternity         numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_dental            numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_optical           numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_ambulance         numeric(18,2),
    ADD COLUMN IF NOT EXISTS benefit_medical_checkup   numeric(18,2),
    -- Pembayaran
    ADD COLUMN IF NOT EXISTS payment_method        varchar(30),
    ADD COLUMN IF NOT EXISTS bank_name             varchar(80),
    ADD COLUMN IF NOT EXISTS account_number        varchar(40),
    ADD COLUMN IF NOT EXISTS account_holder_name   varchar(120),
    ADD COLUMN IF NOT EXISTS card_expiry           varchar(5),
    ADD COLUMN IF NOT EXISTS card_network          varchar(20),
    ADD COLUMN IF NOT EXISTS virtual_account_number varchar(40),
    ADD COLUMN IF NOT EXISTS autodebet_start_date  date,
    ADD COLUMN IF NOT EXISTS autodebet_end_date    date,
    ADD COLUMN IF NOT EXISTS autodebet_mandate_ref varchar(80),
    ADD COLUMN IF NOT EXISTS billing_cycle_day     smallint;

-- ─── beneficiary ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.beneficiary (
    beneficiary_id    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id       uuid        NOT NULL REFERENCES public.contract(contract_id) ON DELETE CASCADE,
    full_name         varchar(200) NOT NULL,
    relationship      varchar(40)  NOT NULL,
    percentage        numeric(5,2) NOT NULL DEFAULT 100,
    nik               varchar(20),
    created_at        timestamptz  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beneficiary_contract ON public.beneficiary(contract_id);

-- ─── rider ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rider (
    rider_id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  uuid        NOT NULL REFERENCES public.contract(contract_id) ON DELETE CASCADE,
    rider_name   varchar(200) NOT NULL,
    coverage     numeric(18,2),
    created_at   timestamptz  DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rider_contract ON public.rider(contract_id);

-- ─── insured_person (tertanggung jika berbeda) ─────────────────
CREATE TABLE IF NOT EXISTS public.insured_person (
    insured_id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id    uuid        NOT NULL UNIQUE REFERENCES public.contract(contract_id) ON DELETE CASCADE,
    full_name      varchar(200) NOT NULL,
    nik            varchar(20),
    birth_date     date,
    gender         varchar(15),
    relationship   varchar(40),
    created_at     timestamptz  DEFAULT now()
);

-- ─── person (tambahan kolom opsional untuk kelengkapan) ────────
ALTER TABLE public.person
    ADD COLUMN IF NOT EXISTS occupation     varchar(120),
    ADD COLUMN IF NOT EXISTS marital_status varchar(30);

-- ─── index untuk query jatuh tempo ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contract_next_due ON public.contract(next_due_date)
    WHERE next_due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_status   ON public.contract(policy_status);

COMMIT;
