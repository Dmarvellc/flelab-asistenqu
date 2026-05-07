import { createAnthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool, type LanguageModel } from "ai";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { findUserWithProfile } from "@/lib/auth-queries";

export const maxDuration = 60;

function resolveAgentLanguageModel(): LanguageModel {
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (anthropicKey) {
        const anthropic = createAnthropic({ apiKey: anthropicKey });
        // Model alias + no cache-control beta header — avoids provider/API mismatches on Vercel.
        return anthropic("claude-haiku-4-5") as LanguageModel;
    }
    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    if (openaiKey) {
        return openai("gpt-4o-mini");
    }
    throw new Error("AI_CREDENTIALS_MISSING");
}

// ─── Tools ────────────────────────────────────────────────────────────────────

function buildTools(userId: string) {
    return {
        get_daily_briefing: tool({
            description: "Ringkasan harian: klaim pending, premi jatuh tempo, permintaan RS. Panggil saat agen minta 'briefing', 'hari ini', atau 'prioritas'.",
            inputSchema: z.object({}),
            execute: async () => {
                const db = await dbPool.connect();
                try {
                    const [claimsRes, premiumRes, requestsRes] = await Promise.all([
                        db.query<{
                            claim_number: string; stage: string;
                            client_name: string; hospital_name: string; updated_at: string;
                        }>(`
                            SELECT cl.claim_number, cl.stage,
                                   p.full_name AS client_name,
                                   h.name AS hospital_name, cl.updated_at
                            FROM claim cl
                            JOIN client c ON cl.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN hospital h ON cl.hospital_id = h.hospital_id
                            WHERE cl.agent_id = $1
                              AND cl.status NOT IN ('APPROVED','REJECTED','CANCELLED')
                            ORDER BY cl.updated_at ASC LIMIT 8
                        `, [userId]),

                        db.query<{ client_name: string; due_date: string; policy: string }>(`
                            SELECT p.full_name AS client_name,
                                   ct.next_due_date AS due_date,
                                   ct.contract_number AS policy
                            FROM contract ct
                            JOIN client c ON ct.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            WHERE c.agent_id = $1
                              AND ct.next_due_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
                              AND ct.status = 'ACTIVE'
                            ORDER BY ct.next_due_date ASC LIMIT 8
                        `, [userId]),

                        db.query<{ count: string }>(`
                            SELECT COUNT(*) AS count FROM patient_data_request pdr
                            JOIN claim cl ON pdr.claim_id = cl.claim_id
                            WHERE cl.agent_id = $1 AND pdr.status = 'PENDING'
                        `, [userId]),
                    ]);

                    const staleDays = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

                    return {
                        date: new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
                        active_claims: claimsRes.rows.map(r => ({
                            no: r.claim_number,
                            client: r.client_name,
                            hospital: r.hospital_name ?? "-",
                            stage: r.stage,
                            stalled_days: staleDays(r.updated_at),
                        })),
                        premiums_due: premiumRes.rows.map(r => ({
                            client: r.client_name,
                            policy: r.policy,
                            due: new Date(r.due_date).toLocaleDateString("id-ID"),
                        })),
                        pending_requests: Number(requestsRes.rows[0]?.count ?? 0),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        search_clients: tool({
            description: "Cari klien berdasarkan nama. Kembalikan max 6 hasil.",
            inputSchema: z.object({
                query: z.string().describe("Nama atau sebagian nama klien"),
            }),
            execute: async ({ query }) => {
                const db = await dbPool.connect();
                try {
                    const res = await db.query<{
                        client_id: string; full_name: string; phone_number: string;
                        client_status: string; contract_number: string; next_due_date: string;
                    }>(`
                        SELECT c.client_id, p.full_name, p.phone_number,
                               c.status AS client_status,
                               ct.contract_number, ct.next_due_date
                        FROM client c
                        JOIN person p ON c.person_id = p.person_id
                        LEFT JOIN contract ct ON c.client_id = ct.client_id
                        WHERE c.agent_id = $1 AND p.full_name ILIKE $2
                        ORDER BY p.full_name LIMIT 6
                    `, [userId, `%${query}%`]);

                    if (!res.rows.length) return { found: false };
                    return {
                        found: true,
                        clients: res.rows.map(r => ({
                            id: r.client_id,
                            name: r.full_name,
                            phone: r.phone_number ?? "-",
                            status: r.client_status,
                            policy: r.contract_number ?? "-",
                            due: r.next_due_date ? new Date(r.next_due_date).toLocaleDateString("id-ID") : "-",
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        get_client_details: tool({
            description: "Profil lengkap klien: data pribadi, polis, dan 3 klaim terakhir. Gunakan client_id dari search_clients.",
            inputSchema: z.object({
                client_id: z.string(),
            }),
            execute: async ({ client_id }) => {
                const db = await dbPool.connect();
                try {
                    const [profileRes, claimsRes] = await Promise.all([
                        db.query<{
                            full_name: string; phone_number: string; birth_date: string;
                            client_status: string; contract_number: string;
                            policy_status: string; next_due_date: string; contract_product: string;
                        }>(`
                            SELECT p.full_name, p.phone_number, p.birth_date,
                                   c.status AS client_status,
                                   ct.contract_number, ct.status AS policy_status,
                                   ct.next_due_date, ct.contract_product
                            FROM client c
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN contract ct ON c.client_id = ct.client_id
                            WHERE c.agent_id = $1 AND c.client_id = $2 LIMIT 4
                        `, [userId, client_id]),

                        db.query<{ claim_number: string; stage: string; status: string; claim_date: string; disease_name: string }>(`
                            SELECT cl.claim_number, cl.stage, cl.status,
                                   cl.claim_date, d.disease_name
                            FROM claim cl
                            LEFT JOIN disease d ON cl.disease_id = d.disease_id
                            WHERE cl.client_id = $1
                            ORDER BY cl.claim_date DESC LIMIT 3
                        `, [client_id]),
                    ]);

                    if (!profileRes.rows.length) return { found: false };
                    const p = profileRes.rows[0];
                    const age = p.birth_date
                        ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 86400000))
                        : null;

                    return {
                        found: true,
                        name: p.full_name,
                        phone: p.phone_number ?? "-",
                        age: age ? `${age} thn` : "-",
                        status: p.client_status,
                        policies: profileRes.rows.filter(r => r.contract_number).map(r => ({
                            no: r.contract_number,
                            product: r.contract_product ?? "-",
                            status: r.policy_status,
                            due: r.next_due_date ? new Date(r.next_due_date).toLocaleDateString("id-ID") : "-",
                        })),
                        claims: claimsRes.rows.map(r => ({
                            no: r.claim_number,
                            disease: r.disease_name ?? "-",
                            date: new Date(r.claim_date).toLocaleDateString("id-ID"),
                            stage: r.stage,
                            status: r.status,
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        get_claim_details: tool({
            description: "Detail klaim: status, stage, tindakan selanjutnya, timeline terbaru. Input: nomor klaim (CLM-XXXX-XXXXX).",
            inputSchema: z.object({
                claim_number: z.string(),
            }),
            execute: async ({ claim_number }) => {
                const db = await dbPool.connect();
                try {
                    const [claimRes, timelineRes] = await Promise.all([
                        db.query<{
                            stage: string; status: string; total_amount: string;
                            claim_date: string; client_name: string; hospital_name: string;
                            disease_name: string; log_number: string;
                            required_action_by_role: string; benefit_type: string;
                        }>(`
                            SELECT cl.stage, cl.status, cl.total_amount, cl.claim_date,
                                   cl.log_number, cl.required_action_by_role, cl.benefit_type,
                                   p.full_name AS client_name,
                                   h.name AS hospital_name, d.disease_name
                            FROM claim cl
                            JOIN client c ON cl.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN hospital h ON cl.hospital_id = h.hospital_id
                            LEFT JOIN disease d ON cl.disease_id = d.disease_id
                            WHERE cl.agent_id = $1 AND cl.claim_number ILIKE $2 LIMIT 1
                        `, [userId, `%${claim_number}%`]),

                        db.query<{ event_type: string; created_at: string }>(`
                            SELECT event_type, created_at FROM claim_timeline
                            WHERE claim_id = (
                                SELECT claim_id FROM claim
                                WHERE agent_id = $1 AND claim_number ILIKE $2 LIMIT 1
                            )
                            ORDER BY created_at DESC LIMIT 5
                        `, [userId, `%${claim_number}%`]),
                    ]);

                    if (!claimRes.rows.length) return { found: false };
                    const r = claimRes.rows[0];
                    const days = Math.floor((Date.now() - new Date(r.claim_date).getTime()) / 86400000);

                    const nextAction: Record<string, string> = {
                        DRAFT: "Lengkapi data & ajukan",
                        PENDING_LOG: "Tunggu LOG dari agensi",
                        LOG_ISSUED: "Kirim LOG ke RS segera",
                        LOG_SENT_TO_HOSPITAL: "Tunggu konfirmasi RS",
                        PENDING_HOSPITAL_INPUT: "Follow up RS jika >3 hari",
                        PENDING_AGENT_REVIEW: "Periksa dokumen RS, submit ke agensi",
                        SUBMITTED_TO_AGENCY: "Menunggu review agensi",
                    };

                    return {
                        found: true,
                        number: claim_number,
                        client: r.client_name,
                        hospital: r.hospital_name ?? "-",
                        disease: r.disease_name ?? "-",
                        stage: r.stage,
                        status: r.status,
                        amount: r.total_amount ? `Rp ${Number(r.total_amount).toLocaleString("id-ID")}` : "-",
                        days_elapsed: days,
                        log: r.log_number ?? "Belum terbit",
                        next_action: nextAction[r.stage] ?? "Hubungi agensi",
                        timeline: timelineRes.rows.map(t => ({
                            event: t.event_type,
                            date: new Date(t.created_at).toLocaleDateString("id-ID"),
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        find_hospitals: tool({
            description: "Cari rumah sakit mitra berdasarkan kota, nama RS, atau spesialisasi.",
            inputSchema: z.object({
                query: z.string().describe("Kota, nama RS, atau spesialisasi"),
                country: z.string().optional().describe("Indonesia / Malaysia / Singapore"),
            }),
            execute: async ({ query, country }) => {
                const db = await dbPool.connect();
                try {
                    const params: (string)[] = [`%${query}%`];
                    let countryClause = "";
                    if (country) { params.push(country); countryClause = `AND h.country ILIKE $${params.length}`; }

                    const res = await db.query<{
                        name: string; city: string; country: string;
                        tier: string; specializations: string[]; is_partner: boolean; avg_rating: string;
                    }>(`
                        SELECT h.name, h.city, h.country, h.tier,
                               h.specializations, h.is_partner, h.avg_rating
                        FROM hospital h
                        WHERE (h.name ILIKE $1 OR h.city ILIKE $1 OR h.specializations::text ILIKE $1)
                        ${countryClause}
                        ORDER BY h.is_partner DESC, h.avg_rating DESC NULLS LAST LIMIT 5
                    `, params);

                    if (!res.rows.length) return { found: false };
                    return {
                        found: true,
                        hospitals: res.rows.map(r => ({
                            name: r.name,
                            location: `${r.city}, ${r.country}`,
                            tier: r.tier,
                            partner: r.is_partner,
                            specializations: r.specializations?.slice(0, 3) ?? [],
                            rating: r.avg_rating ? Number(r.avg_rating).toFixed(1) : "-",
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        draft_whatsapp: tool({
            description: "Scaffold draf WA untuk klien. Panggil ini lalu tulis pesannya langsung.",
            inputSchema: z.object({
                client_name: z.string(),
                type: z.enum(["PREMIUM_REMINDER", "BIRTHDAY", "CLAIM_UPDATE", "DOCUMENT_REQUEST", "FOLLOW_UP"]),
                context: z.string().optional().describe("Info tambahan: nomor polis, jumlah premi, nama penyakit, dll"),
            }),
            execute: async ({ client_name, type, context }) => ({
                client_name, type, context: context ?? "",
            }),
        }),

        analyze_claim_risk: tool({
            description: "Analisis risiko klaim: dokumen kurang, field kosong, potensi penolakan.",
            inputSchema: z.object({
                claim_number: z.string(),
            }),
            execute: async ({ claim_number }) => {
                const db = await dbPool.connect();
                try {
                    const res = await db.query<{
                        stage: string; benefit_type: string; care_cause: string;
                        symptom_onset_date: string; previous_treatment: string;
                        disease_name: string; log_number: string; doc_count: string;
                    }>(`
                        SELECT cl.stage, cl.benefit_type, cl.care_cause,
                               cl.symptom_onset_date, cl.previous_treatment,
                               d.disease_name, cl.log_number,
                               COALESCE((SELECT COUNT(*) FROM claim_document cd WHERE cd.claim_id = cl.claim_id), 0) AS doc_count
                        FROM claim cl
                        LEFT JOIN disease d ON cl.disease_id = d.disease_id
                        WHERE cl.agent_id = $1 AND cl.claim_number ILIKE $2 LIMIT 1
                    `, [userId, `%${claim_number}%`]);

                    if (!res.rows.length) return { found: false };
                    const r = res.rows[0];
                    const issues: string[] = [];

                    if (!r.benefit_type) issues.push("Jenis manfaat kosong");
                    if (!r.care_cause) issues.push("Penyebab perawatan kosong");
                    if (!r.symptom_onset_date) issues.push("Tanggal awal gejala kosong");
                    if (Number(r.doc_count) < 2) issues.push(`Dokumen kurang (${r.doc_count} file, ideal ≥3)`);
                    if (!r.log_number && !["DRAFT","PENDING_LOG"].includes(r.stage)) issues.push("LOG belum terbit");
                    if (r.previous_treatment) issues.push("Ada riwayat penyakit sebelumnya → cek exclusion polis");

                    return {
                        found: true,
                        risk: issues.length === 0 ? "RENDAH" : issues.length <= 2 ? "SEDANG" : "TINGGI",
                        issues,
                        docs: Number(r.doc_count),
                        disease: r.disease_name ?? "-",
                        stage: r.stage,
                    };
                } finally {
                    db.release();
                }
            },
        }),
    };
}

// ─── System prompt (compact) ──────────────────────────────────────────────────

function buildSystemPrompt(agentName: string, page: string): string {
    const pageMap: Record<string, string> = {
        "/claims": "Klaim", "/clients": "Klien", "/appointments": "Janji Temu",
        "/reminders": "Pengingat", "/requests": "Permintaan RS",
        "/network": "Jaringan RS", "/referral": "Referral",
    };
    const ctx = Object.entries(pageMap).find(([k]) => page.includes(k))?.[1] ?? "Dashboard";

    return `Kamu Natalie, asisten AI agen asuransi ${agentName}. Halaman: ${ctx}.

Gunakan tools untuk data real — jangan mengarang. Prioritas: klaim macet · premi jatuh tempo · dokumen kurang.
Draf WA/pesan: keluarkan teks langsung tanpa pengantar. Data: bullet point, ringkas. Jangan ungkap NIK/KTP.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.userId) return new Response("Unauthorized", { status: 401 });

    let model: LanguageModel;
    try {
        model = resolveAgentLanguageModel();
    } catch {
        console.error("[api/ai/agent] No AI credentials configured for this deployment.");
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

    const rawMessages = body.messages;
    const page: string = body.pageContext ?? body.data?.pageContext ?? "";
    const userId = session.userId;

    const profile = await findUserWithProfile(userId).catch(() => null);
    const agentName = profile?.full_name ?? "Agen";

    const messages = await convertToModelMessages(
        (Array.isArray(rawMessages) ? rawMessages : []) as Parameters<typeof convertToModelMessages>[0],
    );

    try {
        const result = await streamText({
            model,
            system: buildSystemPrompt(agentName, page),
            messages,
            tools: buildTools(userId),
            maxOutputTokens: 800,
            stopWhen: stepCountIs(15),
        });

        return result.toUIMessageStreamResponse();
    } catch (e) {
        console.error("[api/ai/agent] streamText failed", e);
        return new Response(JSON.stringify({ error: "unavailable" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });
    }
}
