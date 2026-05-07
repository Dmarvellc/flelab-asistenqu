import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { assertAIConfigured, resolveEconomicalLanguageModels } from "@/lib/ai-runtime";
import { findUserWithProfile } from "@/lib/auth-queries";
import { dbPool } from "@/lib/db";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import type { PoolClient, QueryResultRow } from "pg";
import { z } from "zod";

export const maxDuration = 60;

type AgencyScope = {
  agencyId: string | null;
  agencyName: string;
  adminName: string;
  adminEmail: string | null;
};

async function getAgencyScope(userId: string): Promise<AgencyScope> {
  const profile = await findUserWithProfile(userId).catch(() => null);
  const client = await dbPool.connect();
  try {
    const res = await client.query<{ agency_id: string | null; agency_name: string | null; email: string | null }>(`
      SELECT au.agency_id, a.name AS agency_name, au.email
      FROM public.app_user au
      LEFT JOIN public.agency a ON au.agency_id = a.agency_id
      WHERE au.user_id = $1
      LIMIT 1
    `, [userId]);

    return {
      agencyId: res.rows[0]?.agency_id ?? profile?.agency_id ?? null,
      agencyName: res.rows[0]?.agency_name ?? profile?.agency_name ?? "Agensi",
      adminName: profile?.full_name ?? "Admin Agensi",
      adminEmail: res.rows[0]?.email ?? profile?.email ?? null,
    };
  } finally {
    client.release();
  }
}

function maskNik(nik?: string | null) {
  if (!nik) return null;
  const digits = nik.replace(/\D/g, "");
  if (digits.length < 6) return "tersimpan";
  return `${digits.slice(0, 4)}••••••••${digits.slice(-4)}`;
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
}

function idr(value?: string | number | null) {
  const amount = Number(value ?? 0);
  if (!amount) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

async function safeQuery<T extends QueryResultRow>(
  db: PoolClient,
  unavailableSections: string[],
  section: string,
  sql: string,
  params: unknown[],
  fallbackRows: T[] = [],
) {
  try {
    return await db.query<T>(sql, params);
  } catch (error) {
    console.error(`[api/ai/agency.${section}]`, error);
    unavailableSections.push(section);
    return { rows: fallbackRows };
  }
}

function buildAgencyTools(agencyId: string) {
  return {
    get_agency_briefing: tool({
      description:
        "Ambil briefing operasional agensi: total agen, klien/polis, transfer pending, klaim perlu review, klaim macet, dan ranking agen. Gunakan ini untuk pertanyaan dashboard/briefing/performa.",
      inputSchema: z.object({}),
      execute: async () => {
        const date = new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        const db = await dbPool.connect();
        const unavailableSections: string[] = [];
        try {
          const agentsRes = await safeQuery<{ count: number }>(
            db,
            unavailableSections,
            "jumlah agen",
            "SELECT COUNT(*)::int AS count FROM public.app_user WHERE role = 'agent' AND agency_id = $1",
            [agencyId],
            [{ count: 0 }],
          );

          const clientsRes = await safeQuery<{ count: number }>(
            db,
            unavailableSections,
            "jumlah klien",
            `SELECT COUNT(*)::int AS count
             FROM public.client c
             JOIN public.app_user au ON c.agent_id = au.user_id
             WHERE au.agency_id = $1`,
            [agencyId],
            [{ count: 0 }],
          );

          const transfersRes = await safeQuery<{ count: number }>(
            db,
            unavailableSections,
            "transfer pending",
            `SELECT COUNT(*)::int AS count
             FROM public.agency_transfer_request
             WHERE status = 'PENDING' AND (to_agency_id = $1 OR from_agency_id = $1)`,
            [agencyId],
            [{ count: 0 }],
          );

          const pendingClaimsRes = await safeQuery<{ count: number }>(
            db,
            unavailableSections,
            "klaim perlu review",
            `SELECT COUNT(*)::int AS count
             FROM public.claim c
             JOIN public.client cl ON c.client_id = cl.client_id
             JOIN public.app_user au ON cl.agent_id = au.user_id
             WHERE au.agency_id = $1 AND c.stage = 'SUBMITTED_TO_AGENCY'`,
            [agencyId],
            [{ count: 0 }],
          );

          const claimsRes = await safeQuery<{
            claim_number: string | null;
            stage: string;
            status: string;
            total_amount: string | null;
            updated_at: string | null;
            client_name: string;
            agent_name: string;
            hospital_name: string | null;
          }>(
            db,
            unavailableSections,
            "klaim prioritas",
            `SELECT c.claim_number, c.stage, c.status, c.total_amount, c.updated_at,
                    cp.full_name AS client_name,
                    COALESCE(ap.full_name, au.email) AS agent_name,
                    h.name AS hospital_name
             FROM public.claim c
             JOIN public.client cl ON c.client_id = cl.client_id
             JOIN public.person cp ON cl.person_id = cp.person_id
             JOIN public.app_user au ON cl.agent_id = au.user_id
             LEFT JOIN public.user_person_link upl ON au.user_id = upl.user_id
             LEFT JOIN public.person ap ON upl.person_id = ap.person_id
             LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
             WHERE au.agency_id = $1
               AND c.status NOT IN ('APPROVED','REJECTED','CANCELLED')
             ORDER BY
               CASE WHEN c.stage = 'SUBMITTED_TO_AGENCY' THEN 0 ELSE 1 END,
               c.updated_at ASC NULLS LAST,
               c.created_at ASC
             LIMIT 8`,
            [agencyId],
          );

          const topAgentsRes = await safeQuery<{
            agent_name: string;
            total_points: string | number;
            total_clients: string | number;
            total_claims: string | number;
            approved_claims: string | number;
            pending_claims: string | number;
          }>(
            db,
            unavailableSections,
            "ranking agen",
            `SELECT COALESCE(p.full_name, u.email) AS agent_name,
                    COALESCE(ag.points_balance, 0) AS total_points,
                    COUNT(DISTINCT cl.client_id) AS total_clients,
                    COUNT(DISTINCT c.claim_id) AS total_claims,
                    COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'APPROVED') AS approved_claims,
                    COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status NOT IN ('APPROVED','REJECTED','CANCELLED')) AS pending_claims
             FROM public.app_user u
             LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
             LEFT JOIN public.person p ON upl.person_id = p.person_id
             LEFT JOIN public.agent ag ON ag.agent_id = u.user_id
             LEFT JOIN public.client cl ON cl.agent_id = u.user_id
             LEFT JOIN public.claim c ON c.assigned_agent_id = u.user_id OR c.created_by_user_id = u.user_id
             WHERE u.role = 'agent' AND u.agency_id = $1
             GROUP BY u.user_id, p.full_name, u.email, ag.points_balance
             ORDER BY COALESCE(ag.points_balance, 0) DESC, COUNT(DISTINCT cl.client_id) DESC
             LIMIT 5`,
            [agencyId],
          );

          return {
            ok: true as const,
            date,
            partial: unavailableSections.length > 0,
            unavailable_sections: unavailableSections,
            summary: {
              agents: Number(agentsRes.rows[0]?.count ?? 0),
              clients_or_policies: Number(clientsRes.rows[0]?.count ?? 0),
              pending_transfers: Number(transfersRes.rows[0]?.count ?? 0),
              claims_to_review: Number(pendingClaimsRes.rows[0]?.count ?? 0),
            },
            priority_claims: claimsRes.rows.map((row) => ({
              no: row.claim_number ?? "-",
              client: row.client_name,
              agent: row.agent_name,
              hospital: row.hospital_name ?? "-",
              stage: row.stage,
              status: row.status,
              amount: idr(row.total_amount),
              stalled_days: daysSince(row.updated_at),
            })),
            top_agents: topAgentsRes.rows.map((row) => ({
              name: row.agent_name,
              points: Number(row.total_points ?? 0),
              clients: Number(row.total_clients ?? 0),
              claims: Number(row.total_claims ?? 0),
              approved_claims: Number(row.approved_claims ?? 0),
              pending_claims: Number(row.pending_claims ?? 0),
            })),
          };
        } finally {
          db.release();
        }
      },
    }),

    search_agents: tool({
      description:
        "Cari agen dalam agensi berdasarkan nama/email. Set include_contact=true hanya jika pengguna meminta nomor telepon atau email untuk follow-up operasional. NIK selalu dimasking.",
      inputSchema: z.object({
        query: z.string().describe("Nama atau email agen"),
        include_contact: z.boolean().optional(),
      }),
      execute: async ({ query, include_contact }) => {
        const q = query.trim();
        if (q.length < 2) return { found: false, reason: "query terlalu pendek" };

        const db = await dbPool.connect();
        try {
          const res = await db.query<{
            user_id: string;
            full_name: string;
            email: string;
            phone_number: string | null;
            nik: string | null;
            status: string;
            total_clients: string;
            total_claims: string;
          }>(`
            SELECT u.user_id,
                   COALESCE(p.full_name, u.email) AS full_name,
                   u.email,
                   p.phone_number,
                   p.id_card AS nik,
                   u.status,
                   (SELECT COUNT(*) FROM public.client c WHERE c.agent_id = u.user_id) AS total_clients,
                   (SELECT COUNT(*) FROM public.claim c WHERE c.created_by_user_id = u.user_id OR c.assigned_agent_id = u.user_id) AS total_claims
            FROM public.app_user u
            LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
            LEFT JOIN public.person p ON upl.person_id = p.person_id
            WHERE u.role = 'agent'
              AND u.agency_id = $1
              AND (p.full_name ILIKE $2 OR u.email ILIKE $2)
            ORDER BY COALESCE(p.full_name, u.email)
            LIMIT 8
          `, [agencyId, `%${q}%`]);

          if (!res.rows.length) return { found: false };
          return {
            found: true,
            agents: res.rows.map((row) => ({
              id: row.user_id,
              name: row.full_name,
              status: row.status,
              email: include_contact ? row.email : undefined,
              phone: include_contact ? row.phone_number ?? "-" : undefined,
              nik_masked: maskNik(row.nik),
              clients: Number(row.total_clients ?? 0),
              claims: Number(row.total_claims ?? 0),
            })),
          };
        } finally {
          db.release();
        }
      },
    }),

    get_agent_performance: tool({
      description:
        "Ambil performa agen. Pakai agent_query jika pengguna menyebut agen tertentu; kosongkan untuk ranking keseluruhan.",
      inputSchema: z.object({
        agent_query: z.string().optional(),
        limit: z.number().min(1).max(10).optional(),
      }),
      execute: async ({ agent_query, limit }) => {
        const params: unknown[] = [agencyId];
        const q = agent_query?.trim();
        let queryClause = "";
        if (q) {
          params.push(`%${q}%`);
          queryClause = `AND (p.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }
        params.push(limit ?? 10);

        const db = await dbPool.connect();
        try {
          const res = await db.query<{
            user_id: string;
            agent_name: string;
            rank_label: string | null;
            total_points: string | number;
            total_clients: string | number;
            total_claims: string | number;
            approved_claims: string | number;
            rejected_claims: string | number;
            pending_claims: string | number;
            total_approved_value: string | number;
            referral_points: string | number;
          }>(`
            WITH client_stats AS (
              SELECT c.agent_id, COUNT(*) AS total_clients
              FROM public.client c
              JOIN public.app_user au ON c.agent_id = au.user_id
              WHERE au.agency_id = $1 AND au.role = 'agent'
              GROUP BY c.agent_id
            ),
            claim_stats AS (
              SELECT au.user_id,
                     COUNT(DISTINCT c.claim_id) AS total_claims,
                     COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'APPROVED') AS approved_claims,
                     COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'REJECTED') AS rejected_claims,
                     COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status NOT IN ('APPROVED','REJECTED','CANCELLED')) AS pending_claims,
                     COALESCE(SUM(c.total_amount) FILTER (WHERE c.status = 'APPROVED'), 0) AS total_approved_value
              FROM public.app_user au
              LEFT JOIN public.claim c ON c.assigned_agent_id = au.user_id OR c.created_by_user_id = au.user_id
              WHERE au.agency_id = $1 AND au.role = 'agent'
              GROUP BY au.user_id
            )
            SELECT u.user_id,
                   COALESCE(p.full_name, u.email) AS agent_name,
                   COALESCE(t.name, 'Bronze') AS rank_label,
                   COALESCE(ag.points_balance, 0) AS total_points,
                   COALESCE(cs.total_clients, 0) AS total_clients,
                   COALESCE(cls.total_claims, 0) AS total_claims,
                   COALESCE(cls.approved_claims, 0) AS approved_claims,
                   COALESCE(cls.rejected_claims, 0) AS rejected_claims,
                   COALESCE(cls.pending_claims, 0) AS pending_claims,
                   COALESCE(cls.total_approved_value, 0) AS total_approved_value,
                   COALESCE(u.referral_points, 0) AS referral_points
            FROM public.app_user u
            LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
            LEFT JOIN public.person p ON upl.person_id = p.person_id
            LEFT JOIN public.agent ag ON ag.agent_id = u.user_id
            LEFT JOIN public.tier t ON ag.current_tier_id = t.tier_id
            LEFT JOIN client_stats cs ON cs.agent_id = u.user_id
            LEFT JOIN claim_stats cls ON cls.user_id = u.user_id
            WHERE u.role = 'agent' AND u.agency_id = $1 ${queryClause}
            ORDER BY COALESCE(ag.points_balance, 0) DESC, COALESCE(cls.total_approved_value, 0) DESC
            LIMIT $${params.length}
          `, params);

          if (!res.rows.length) return { found: false };
          return {
            found: true,
            agents: res.rows.map((row) => ({
              id: row.user_id,
              name: row.agent_name,
              rank: row.rank_label ?? "Bronze",
              points: Number(row.total_points ?? 0),
              clients: Number(row.total_clients ?? 0),
              claims: Number(row.total_claims ?? 0),
              approved_claims: Number(row.approved_claims ?? 0),
              rejected_claims: Number(row.rejected_claims ?? 0),
              pending_claims: Number(row.pending_claims ?? 0),
              approved_value: idr(row.total_approved_value),
              referral_points: Number(row.referral_points ?? 0),
            })),
          };
        } finally {
          db.release();
        }
      },
    }),

    search_agency_claims: tool({
      description: "Cari klaim dalam agensi berdasarkan nomor klaim, nama klien, atau nama agen.",
      inputSchema: z.object({
        query: z.string().describe("Nomor klaim, nama klien, atau nama agen"),
      }),
      execute: async ({ query }) => {
        const q = query.trim();
        if (q.length < 2) return { found: false, reason: "query terlalu pendek" };

        const db = await dbPool.connect();
        try {
          const res = await db.query<{
            claim_number: string | null;
            client_name: string;
            agent_name: string;
            hospital_name: string | null;
            disease_name: string | null;
            stage: string;
            status: string;
            total_amount: string | null;
            updated_at: string | null;
          }>(`
            SELECT c.claim_number,
                   cp.full_name AS client_name,
                   COALESCE(ap.full_name, au.email) AS agent_name,
                   h.name AS hospital_name,
                   d.name AS disease_name,
                   c.stage,
                   c.status,
                   c.total_amount,
                   c.updated_at
            FROM public.claim c
            JOIN public.client cl ON c.client_id = cl.client_id
            JOIN public.person cp ON cl.person_id = cp.person_id
            JOIN public.app_user au ON cl.agent_id = au.user_id
            LEFT JOIN public.user_person_link upl ON au.user_id = upl.user_id
            LEFT JOIN public.person ap ON upl.person_id = ap.person_id
            LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
            LEFT JOIN public.disease d ON c.disease_id = d.disease_id
            WHERE au.agency_id = $1
              AND (c.claim_number ILIKE $2 OR cp.full_name ILIKE $2 OR ap.full_name ILIKE $2 OR au.email ILIKE $2)
            ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
            LIMIT 8
          `, [agencyId, `%${q}%`]);

          if (!res.rows.length) return { found: false };
          return {
            found: true,
            claims: res.rows.map((row) => ({
              no: row.claim_number ?? "-",
              client: row.client_name,
              agent: row.agent_name,
              hospital: row.hospital_name ?? "-",
              disease: row.disease_name ?? "-",
              stage: row.stage,
              status: row.status,
              amount: idr(row.total_amount),
              stale_days: daysSince(row.updated_at),
            })),
          };
        } finally {
          db.release();
        }
      },
    }),

    draft_outreach_message: tool({
      description:
        "Scaffold draf pesan untuk agen/klien. Setelah tool ini, tulis langsung isi pesan tanpa pembuka.",
      inputSchema: z.object({
        audience: z.enum(["AGENT", "CLIENT", "TEAM"]),
        goal: z.string().describe("Tujuan pesan"),
        context: z.string().optional().describe("Konteks spesifik seperti nama agen, target, klaim, atau deadline"),
      }),
      execute: async ({ audience, goal, context }) => ({
        audience,
        goal,
        context: context ?? "",
      }),
    }),
  };
}

function pageLabel(path: string) {
  const pageMap: Record<string, string> = {
    "/claims": "Klaim Agensi",
    "/agents": "Manajemen Agen",
    "/performance": "Performa Agen",
    "/transfers": "Transfer Agen",
    "/clients": "Klien Agensi",
    "/network": "Jaringan Rumah Sakit",
    "/team": "Staff Internal",
    "/settings": "Pengaturan",
  };
  return Object.entries(pageMap).find(([key]) => path.includes(key))?.[1] ?? "Dashboard Agensi";
}

function buildSystemPrompt(scope: AgencyScope, page: string) {
  return `Kamu AI Commander untuk dashboard Admin Agensi AsistenQu.
Pengguna: ${scope.adminName}.
Agensi: ${scope.agencyName}.
Halaman saat ini: ${pageLabel(page)}.

Tujuan utama: bantu pimpinan agensi mengambil keputusan operasional dengan cepat, aman, dan berbasis data nyata. Gunakan tools untuk data real-time; jangan mengarang angka, nama, klaim, atau status.

Gaya: strategis, lugas, hangat, dan siap aksi. Untuk briefing, susun prioritas hari ini, risiko terbesar, dan langkah berikutnya. Untuk analisis performa, beri insight yang bisa dipakai manajer agensi, bukan sekadar membaca angka.

Draf WA/email: keluarkan isi pesan langsung tanpa kata pengantar dan tanpa penutup instruksional.

Format jawaban: teks bersih untuk chat. Jangan gunakan syntax Markdown mentah seperti **, ###, tabel Markdown, XML, atau JSON kecuali diminta. Pakai judul biasa, baris pendek, dan bullet sederhana bila membantu.

Keamanan dan privasi: jangan mengungkap NIK lengkap, alamat lengkap, token, cookie, atau data sensitif. Nomor telepon/email agen hanya boleh disebut jika pengguna meminta secara spesifik untuk follow-up kerja. Jika data tidak tersedia atau tool partial, jelaskan singkat dan lanjutkan dengan opsi aksi yang masih bisa dilakukan.`;
}

export async function POST(req: Request) {
  const userId = await getAdminAgencyUserIdFromCookies();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const rateLimit = await consumeRateLimit({
    namespace: "ai:agency",
    identifier: `${userId}:${getClientIp(req)}`,
    limit: Number(process.env.AI_AGENCY_RATE_LIMIT_PER_MINUTE ?? 25),
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: "rate_limited",
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    });
  }

  const models = resolveEconomicalLanguageModels();
  try {
    assertAIConfigured(models);
  } catch {
    console.error("[api/ai/agency] No AI credentials configured for this deployment.");
    return new Response(JSON.stringify({ error: "unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: unknown[]; pageContext?: string; data?: { pageContext?: string } };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const scope = await getAgencyScope(userId);
  if (!scope.agencyId) {
    return new Response(JSON.stringify({ error: "agency_not_found" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uiMessages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const messages = await convertToModelMessages(
    uiMessages as Parameters<typeof convertToModelMessages>[0],
  );
  const page = body.pageContext ?? body.data?.pageContext ?? "";

  let lastError: unknown;
  for (const candidate of models) {
    try {
      const result = await streamText({
        model: candidate.model,
        system: buildSystemPrompt(scope, page),
        messages,
        tools: buildAgencyTools(scope.agencyId),
        maxOutputTokens: 900,
        stopWhen: stepCountIs(12),
      });

      return result.toUIMessageStreamResponse();
    } catch (error) {
      lastError = error;
      console.error(`[api/ai/agency] streamText failed on ${candidate.label}`, error);
    }
  }

  console.error("[api/ai/agency] all model candidates failed", lastError);
  return new Response(JSON.stringify({ error: "unavailable" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}
