/**
 * Shared types for the client-request UI. Kept separate from the
 * server-only `lib/client-requests.ts` so client components can import.
 */

export type ClientRequestType =
  | "room_upgrade"
  | "room_downgrade"
  | "transfer_room"
  | "extend_stay"
  | "early_discharge"
  | "add_treatment"
  | "add_medication"
  | "request_specialist"
  | "request_doctor_change"
  | "change_payment_method"
  | "request_medical_record"
  | "transfer_hospital"
  | "other";

export type RequestedByRelation = "client_self" | "family" | "unknown";
export type ClientRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ClientRequestRow {
  id: string;
  client_id: string;
  hospital_id: string;
  agent_id: string;
  claim_id: string | null;
  request_type: ClientRequestType;
  payload: Record<string, unknown>;
  notes: string | null;
  requested_by_relation: RequestedByRelation;
  requested_by_name: string | null;
  status: ClientRequestStatus;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decided_reason: string | null;
  created_at: string;
  agent_email?: string;
  client_name?: string;
}

export interface ClientRequestMessage {
  id: string;
  client_request_id: string;
  sender_user_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
  sender_email?: string;
  sender_role?: string | null;
}

export interface ClientRequestAudit {
  id: string;
  client_request_id: string;
  from_status: ClientRequestStatus | null;
  to_status: ClientRequestStatus;
  changed_by_user_id: string;
  reason: string | null;
  created_at: string;
  by_email?: string;
  by_role?: string | null;
}

export interface ClientRequestDetail extends ClientRequestRow {
  messages: ClientRequestMessage[];
  audit: ClientRequestAudit[];
}

/* Labels (kept in-sync with server-side labelForType) */
export const TYPE_LABELS: Record<ClientRequestType, string> = {
  room_upgrade: "Naik kelas kamar",
  room_downgrade: "Turun kelas kamar",
  transfer_room: "Pindah kamar",
  extend_stay: "Perpanjang masa rawat",
  early_discharge: "Pulang lebih cepat",
  add_treatment: "Tambah tindakan",
  add_medication: "Tambah obat",
  request_specialist: "Konsultasi spesialis",
  request_doctor_change: "Ganti DPJP",
  change_payment_method: "Ganti metode pembayaran",
  request_medical_record: "Permintaan rekam medis",
  transfer_hospital: "Rujuk RS lain",
  other: "Permintaan lain",
};

export const STATUS_LABELS: Record<ClientRequestStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const RELATION_LABELS: Record<RequestedByRelation, string> = {
  client_self: "Klien sendiri",
  family: "Keluarga klien",
  unknown: "Tidak diketahui",
};
