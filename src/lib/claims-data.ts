export type ClaimStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID' | 'INFO_REQUESTED' | 'INFO_SUBMITTED' | 'On Progress' | 'Declined';

export interface Claim {
  claim_id: string;
  client_name: string;
  policy_number: string;
  claim_date: string; // ISO date string
  status: ClaimStatus;
  missing_data?: string[]; // Array of strings describing missing data
  hospital_name: string;
  total_amount: number;
  request_date?: string; // Optional if claim_date covers it
  disease_name?: string;
  notes?: string;
}

export const claims: Claim[] = [
  {
    claim_id: 'CLM-001',
    client_name: 'Budi Santoso',
    policy_number: 'POL-882190',
    claim_date: '2023-10-25',
    status: 'INFO_REQUESTED',
    missing_data: ['Lab Results', 'Doctor Signal'],
    hospital_name: 'RS Siloam Kebon Jeruk',
    total_amount: 5200000,
    disease_name: 'Demam Berdarah',
  },
  {
    claim_id: 'CLM-002',
    client_name: 'Siti Aminah',
    policy_number: 'POL-112345',
    claim_date: '2023-10-20',
    status: 'APPROVED',
    hospital_name: 'RS Pondok Indah',
    total_amount: 12500000,
    disease_name: 'Operasi Usus Buntu',
  },
  {
    claim_id: 'CLM-003',
    client_name: 'Andi Wijaya',
    policy_number: 'POL-556789',
    claim_date: '2023-10-22',
    status: 'REJECTED',
    missing_data: ['Policy Expired', 'Invalid Claim Type'],
    hospital_name: 'RS Cipto Mangunkusumo',
    total_amount: 3100000,
    disease_name: 'Rawat Jalan',
  },
  {
    claim_id: 'CLM-004',
    client_name: 'Dewi Lestari',
    policy_number: 'POL-998877',
    claim_date: '2023-10-26',
    status: 'INFO_SUBMITTED',
    missing_data: ['Payment Receipt'],
    hospital_name: 'RS Mitra Keluarga',
    total_amount: 1800000,
    disease_name: 'Konsultasi Spesialis',
  },
];
