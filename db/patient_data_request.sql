CREATE TABLE IF NOT EXISTS public.patient_data_request (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL, -- References app_user(user_id) implicitly or joined manually
  agent_id UUID NOT NULL,    -- References app_user(user_id)
  person_id UUID NOT NULL,   -- References person(person_id)
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')) DEFAULT 'PENDING',
  additional_data_request TEXT,
  additional_data_file TEXT, -- Path to uploaded file
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_data_request_hospital_id ON public.patient_data_request(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_data_request_agent_id ON public.patient_data_request(agent_id);
CREATE INDEX IF NOT EXISTS idx_patient_data_request_status ON public.patient_data_request(status);
