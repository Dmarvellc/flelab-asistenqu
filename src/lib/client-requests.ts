import "server-only";
import { dbPool } from "./db";
import { notify, notifyMany, getHospitalAdminUserIds } from "./notifications";

/**
 * Client-request workflow.
 *
 * Lifecycle:
 *   agent.create()    → status=pending, notify all hospital admins
 *   hospital.decide() → status=approved|rejected, notify the agent back
 *   agent.cancel()    → status=cancelled (only while still pending)
 *
 * All transitions are auto-mirrored into client_request_status_change by the
 * `tr_client_request_audit` trigger — we never DELETE/UPDATE the audit table.
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

export class ClientRequestError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "ClientRequestError";
  }
}

export interface CreateRequestInput {
  agentUserId: string;
  clientId: string;
  hospitalId: string;
  claimId?: string | null;
  requestType: ClientRequestType;
  payload?: Record<string, unknown>;
  notes?: string;
  requestedByRelation?: RequestedByRelation;
  requestedByName?: string;
}

const TYPE_LABELS: Record<ClientRequestType, string> = {
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

export function labelForType(t: ClientRequestType): string {
  return TYPE_LABELS[t] ?? t;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  CREATE                                                                */
/* ────────────────────────────────────────────────────────────────────── */

export async function createClientRequest(input: CreateRequestInput) {
  // Validate client belongs to a hospital that matches (if claim given, check that too).
  // We're permissive on client↔hospital binding because a client can be at any hospital.

  const r = await dbPool.query<{
    id: string;
    client_name: string;
    agent_name: string | null;
  }>(
    `
    WITH ins AS (
      INSERT INTO client_request
        (client_id, hospital_id, agent_id, claim_id,
         request_type, payload, notes,
         requested_by_relation, requested_by_name, status)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,'pending')
      RETURNING id
    )
    SELECT
      ins.id,
      COALESCE(p.full_name, 'Klien') AS client_name,
      au.email                       AS agent_name
    FROM ins
    LEFT JOIN client c   ON c.client_id = $1
    LEFT JOIN person p   ON p.person_id = c.person_id
    LEFT JOIN app_user au ON au.user_id = $3
    `,
    [
      input.clientId,
      input.hospitalId,
      input.agentUserId,
      input.claimId ?? null,
      input.requestType,
      JSON.stringify(input.payload ?? {}),
      input.notes ?? null,
      input.requestedByRelation ?? "unknown",
      input.requestedByName ?? null,
    ],
  );

  const reqId = r.rows[0].id;
  const clientName = r.rows[0].client_name;
  const agentEmail = r.rows[0].agent_name ?? "Agent";

  // Notify all hospital admins for this hospital.
  const adminIds = await getHospitalAdminUserIds(input.hospitalId);
  await notifyMany(adminIds, {
    event: "client_request.created",
    title: `${labelForType(input.requestType)} — ${clientName}`,
    body: `Pengajuan baru dari ${agentEmail}. Klik untuk melihat detail.`,
    link: `/hospital/patients/${input.clientId}#request-${reqId}`,
    meta: { client_request_id: reqId, client_id: input.clientId },
  });

  return { id: reqId };
}

/* ────────────────────────────────────────────────────────────────────── */
/*  DECIDE (approve / reject)                                             */
/* ────────────────────────────────────────────────────────────────────── */

export async function decideClientRequest(params: {
  requestId: string;
  decidedBy: string;
  decision: "approved" | "rejected";
  reason?: string;
}) {
  const cur = await dbPool.query<{
    status: ClientRequestStatus;
    agent_id: string;
    request_type: ClientRequestType;
    client_id: string;
    client_name: string;
  }>(
    `
    SELECT cr.status, cr.agent_id, cr.request_type, cr.client_id,
           COALESCE(p.full_name, 'Klien') AS client_name
    FROM client_request cr
    LEFT JOIN client c ON c.client_id = cr.client_id
    LEFT JOIN person p ON p.person_id = c.person_id
    WHERE cr.id = $1
    `,
    [params.requestId],
  );
  if (cur.rows.length === 0) throw new ClientRequestError(404, "Request tidak ditemukan");
  if (cur.rows[0].status !== "pending")
    throw new ClientRequestError(409, `Request sudah ${cur.rows[0].status}, tidak bisa diubah`);

  await dbPool.query(
    `
    UPDATE client_request
       SET status = $1,
           decided_at = now(),
           decided_by_user_id = $2,
           decided_reason = $3
     WHERE id = $4
    `,
    [params.decision, params.decidedBy, params.reason ?? null, params.requestId],
  );

  await notify({
    userId: cur.rows[0].agent_id,
    event:
      params.decision === "approved"
        ? "client_request.approved"
        : "client_request.rejected",
    title: `${labelForType(cur.rows[0].request_type)} — ${
      params.decision === "approved" ? "Disetujui" : "Ditolak"
    }`,
    body:
      params.reason ||
      `Pengajuan untuk ${cur.rows[0].client_name} telah ${
        params.decision === "approved" ? "disetujui" : "ditolak"
      } oleh rumah sakit.`,
    link: `/agent/clients/${cur.rows[0].client_id}#request-${params.requestId}`,
    meta: { client_request_id: params.requestId },
  });
}

/* ────────────────────────────────────────────────────────────────────── */
/*  CANCEL (agent only, pending only)                                     */
/* ────────────────────────────────────────────────────────────────────── */

export async function cancelClientRequest(params: {
  requestId: string;
  agentUserId: string;
  reason?: string;
}) {
  const r = await dbPool.query(
    `
    UPDATE client_request
       SET status = 'cancelled',
           decided_at = now(),
           decided_by_user_id = $2,
           decided_reason = $3
     WHERE id = $1
       AND agent_id = $2
       AND status = 'pending'
     RETURNING id
    `,
    [params.requestId, params.agentUserId, params.reason ?? null],
  );
  if (r.rowCount === 0) {
    throw new ClientRequestError(409, "Request tidak bisa dibatalkan (mungkin sudah diproses).");
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  MESSAGE                                                               */
/* ────────────────────────────────────────────────────────────────────── */

export async function postRequestMessage(params: {
  requestId: string;
  senderUserId: string;
  body: string;
  attachmentUrl?: string;
}) {
  if (!params.body.trim()) throw new ClientRequestError(400, "Pesan kosong");

  const ctx = await dbPool.query<{
    agent_id: string;
    hospital_id: string;
    client_id: string;
    request_type: ClientRequestType;
    sender_role: string | null;
  }>(
    `
    SELECT cr.agent_id, cr.hospital_id, cr.client_id, cr.request_type,
           au.role AS sender_role
    FROM client_request cr
    LEFT JOIN app_user au ON au.user_id = $2
    WHERE cr.id = $1
    `,
    [params.requestId, params.senderUserId],
  );
  if (ctx.rows.length === 0) throw new ClientRequestError(404, "Request tidak ditemukan");
  const { agent_id, hospital_id, client_id, request_type, sender_role } = ctx.rows[0];

  await dbPool.query(
    `INSERT INTO client_request_message (client_request_id, sender_user_id, body, attachment_url)
     VALUES ($1, $2, $3, $4)`,
    [params.requestId, params.senderUserId, params.body.trim(), params.attachmentUrl ?? null],
  );

  // Notify the OTHER side: if sender is agent, notify hospital admins;
  // if sender is anyone else (hospital admin), notify the agent.
  const isAgentSender = params.senderUserId === agent_id;
  if (isAgentSender) {
    const admins = await getHospitalAdminUserIds(hospital_id);
    await notifyMany(admins, {
      event: "client_request.message",
      title: `Pesan baru — ${labelForType(request_type)}`,
      body: params.body.slice(0, 140),
      link: `/hospital/patients/${client_id}#request-${params.requestId}`,
      meta: { client_request_id: params.requestId },
    });
  } else {
    await notify({
      userId: agent_id,
      event: "client_request.message",
      title: `Pesan dari rumah sakit — ${labelForType(request_type)}`,
      body: params.body.slice(0, 140),
      link: `/agent/clients/${client_id}#request-${params.requestId}`,
      meta: { client_request_id: params.requestId, sender_role },
    });
  }
}

/* ────────────────────────────────────────────────────────────────────── */
/*  READ                                                                  */
/* ────────────────────────────────────────────────────────────────────── */

export async function listRequestsForClient(clientId: string) {
  const r = await dbPool.query(
    `
    SELECT cr.*, au.email AS agent_email
    FROM client_request cr
    LEFT JOIN app_user au ON au.user_id = cr.agent_id
    WHERE cr.client_id = $1
    ORDER BY cr.created_at DESC
    `,
    [clientId],
  );
  return r.rows;
}

export async function listRequestsForHospital(
  hospitalId: string,
  opts: { status?: ClientRequestStatus; limit?: number } = {},
) {
  const params: unknown[] = [hospitalId];
  let where = "cr.hospital_id = $1";
  if (opts.status) {
    params.push(opts.status);
    where += ` AND cr.status = $${params.length}`;
  }
  params.push(opts.limit ?? 50);
  const r = await dbPool.query(
    `
    SELECT cr.*,
           au.email                  AS agent_email,
           COALESCE(p.full_name,'')  AS client_name
    FROM client_request cr
    LEFT JOIN app_user au ON au.user_id = cr.agent_id
    LEFT JOIN client c   ON c.client_id = cr.client_id
    LEFT JOIN person p   ON p.person_id = c.person_id
    WHERE ${where}
    ORDER BY cr.created_at DESC
    LIMIT $${params.length}
    `,
    params,
  );
  return r.rows;
}

export async function getRequestDetail(requestId: string) {
  const r = await dbPool.query(
    `
    SELECT cr.*,
           au.email AS agent_email,
           COALESCE(p.full_name,'') AS client_name
    FROM client_request cr
    LEFT JOIN app_user au ON au.user_id = cr.agent_id
    LEFT JOIN client c   ON c.client_id = cr.client_id
    LEFT JOIN person p   ON p.person_id = c.person_id
    WHERE cr.id = $1
    `,
    [requestId],
  );
  if (r.rows.length === 0) return null;
  const head = r.rows[0];

  const [msgs, audits] = await Promise.all([
    dbPool.query(
      `
      SELECT m.*, au.email AS sender_email, au.role AS sender_role
      FROM client_request_message m
      LEFT JOIN app_user au ON au.user_id = m.sender_user_id
      WHERE m.client_request_id = $1
      ORDER BY m.created_at
      `,
      [requestId],
    ),
    dbPool.query(
      `
      SELECT s.*, au.email AS by_email, au.role AS by_role
      FROM client_request_status_change s
      LEFT JOIN app_user au ON au.user_id = s.changed_by_user_id
      WHERE s.client_request_id = $1
      ORDER BY s.created_at
      `,
      [requestId],
    ),
  ]);

  return { ...head, messages: msgs.rows, audit: audits.rows };
}
