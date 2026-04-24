-- Performance indexes for high-traffic dashboard endpoints.
-- Safe to run multiple times.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_agent_created_at
ON public.client (agent_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_client_next_due_date
ON public.contract (client_id, next_due_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_client_created_at
ON public.contract (client_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contract_detail_contract
ON public.contract_detail (contract_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_created_by_created_at
ON public.claim (created_by_user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_created_by_stage
ON public.claim (created_by_user_id, stage);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_claim_assigned_status
ON public.claim (assigned_agent_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_role_scope_hospital
ON public.user_role (scope_type, scope_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_data_request_hospital
ON public.patient_data_request (hospital_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointment_agent_date_status
ON public.appointment (agent_user_id, appointment_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_user_agency_role_status
ON public.app_user (agency_id, role, status);
