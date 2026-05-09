export type ClaimStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'INFO_REQUESTED' | 'INFO_SUBMITTED' | 'On Progress' | 'Declined' | 'DRAFT' | 'IN_PROGRESS' | 'REVIEW';

export interface Claim {
  claim_id: string;
  client_name: string;
  policy_number: string;
  claim_date: string; // ISO date string
  status: string; // Changed to string to allow flexibility
  stage?: string; // New field
  missing_data?: string[]; // Array of strings describing missing data
  hospital_name: string;
  total_amount: number;
  request_date?: string; // Optional if claim_date covers it
  disease_name?: string;
  notes?: string;
  agent_notes?: string;
  hospital_notes?: string;
  admin_review_notes?: string;
}
