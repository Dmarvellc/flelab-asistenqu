import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";
import { findUserWithProfile } from "@/lib/auth-queries";

export const maxDuration = 60;

// ─── Tool definitions ────────────────────────────────────────────────────────

function buildTools(userId: string) {
    return {
        get_daily_briefing: tool({
            description:
                "Ambil ringkasan harian untuk agen: klaim yang butuh tindakan segera, tagihan premi yang akan jatuh tempo, permintaan dari rumah sakit yang pending, dan ulang tahun klien minggu ini. Panggil ini ketika agen minta briefing harian atau 'apa yang perlu saya lakukan hari ini'.",
            parameters: z.object({}),
            execute: async () => {
                const db = await dbPool.connect();
                try {
                    const [claimsRes, remindersRes, requestsRes] = await Promise.all([
                        db.query<{
                            claim_id: string; claim_number: string; stage: string;
                            status: string; client_name: string; hospital_name: string;
                            updated_at: string; total_amount: string;
                        }>(`
                            SELECT
                                cl.claim_id, cl.claim_number, cl.stage, cl.status,
                                p.full_name AS client_name,
                                h.name AS hospital_name,
                                cl.updated_at, cl.total_amount
                            FROM claim cl
                            JOIN client c ON cl.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN hospital h ON cl.hospital_id = h.hospital_id
                            WHERE cl.agent_id = $1
                              AND cl.status NOT IN ('APPROVED','REJECTED','CANCELLED')
                            ORDER BY cl.updated_at ASC
                            LIMIT 10
                        `, [userId]),

                        db.query<{
                            reminder_type: string; client_name: string;
                            due_date: string; policy_number: string;
                        }>(`
                            SELECT
                                'PREMIUM_DUE' AS reminder_type,
                                p.full_name AS client_name,
                                ct.next_due_date AS due_date,
                                ct.contract_number AS policy_number
                            FROM contract ct
                            JOIN client c ON ct.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            WHERE c.agent_id = $1
                              AND ct.next_due_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
                              AND ct.status = 'ACTIVE'
                            ORDER BY ct.next_due_date ASC
                            LIMIT 10
                        `, [userId]),

                        db.query<{ count: string }>(`
                            SELECT COUNT(*) AS count
                            FROM patient_data_request pdr
                            JOIN claim cl ON pdr.claim_id = cl.claim_id
                            WHERE cl.agent_id = $1 AND pdr.status = 'PENDING'
                        `, [userId]),
                    ]);

                    const daysSinceUpdate = (dateStr: string) => {
                        const diff = Date.now() - new Date(dateStr).getTime();
                        return Math.floor(diff / 86400000);
                    };

                    const urgentClaims = claimsRes.rows.map(r => ({
                        claim_number: r.claim_number,
                        client: r.client_name,
                        hospital: r.hospital_name,
                        stage: r.stage,
                        days_stalled: daysSinceUpdate(r.updated_at),
                        amount: r.total_amount
                            ? `Rp ${Number(r.total_amount).toLocaleString("id-ID")}`
                            : "Jumlah belum diisi",
                    }));

                    return {
                        date: new Date().toLocaleDateString("id-ID", {
                            weekday: "long", year: "numeric", month: "long", day: "numeric"
                        }),
                        urgent_claims: urgentClaims,
                        premium_reminders: remindersRes.rows.map(r => ({
                            client: r.client_name,
                            policy: r.policy_number,
                            due_date: new Date(r.due_date).toLocaleDateString("id-ID"),
                        })),
                        pending_hospital_requests: Number(requestsRes.rows[0]?.count ?? 0),
                        summary: {
                            active_claims: urgentClaims.length,
                            premiums_due_soon: remindersRes.rows.length,
                            stalled_claims: urgentClaims.filter(c => c.days_stalled > 3).length,
                        },
                    };
                } finally {
                    db.release();
                }
            },
        }),

        search_clients: tool({
            description:
                "Cari klien agen berdasarkan nama. Kembalikan daftar klien yang cocok beserta info polis aktif mereka.",
            parameters: z.object({
                query: z.string().describe("Nama klien atau sebagian nama untuk dicari"),
            }),
            execute: async ({ query }) => {
                const db = await dbPool.connect();
                try {
                    const res = await db.query<{
                        client_id: string; full_name: string; phone_number: string;
                        client_status: string; contract_number: string;
                        policy_status: string; next_due_date: string;
                    }>(`
                        SELECT
                            c.client_id, p.full_name, p.phone_number,
                            c.status AS client_status,
                            ct.contract_number, ct.status AS policy_status,
                            ct.next_due_date
                        FROM client c
                        JOIN person p ON c.person_id = p.person_id
                        LEFT JOIN contract ct ON c.client_id = ct.client_id
                        WHERE c.agent_id = $1
                          AND p.full_name ILIKE $2
                        ORDER BY p.full_name
                        LIMIT 8
                    `, [userId, `%${query}%`]);

                    if (res.rows.length === 0) {
                        return { found: false, message: `Tidak ada klien dengan nama "${query}"` };
                    }

                    return {
                        found: true,
                        clients: res.rows.map(r => ({
                            client_id: r.client_id,
                            name: r.full_name,
                            phone: r.phone_number || "Tidak tersedia",
                            status: r.client_status,
                            policy_number: r.contract_number || "Belum ada polis",
                            policy_status: r.policy_status || "N/A",
                            next_premium_due: r.next_due_date
                                ? new Date(r.next_due_date).toLocaleDateString("id-ID")
                                : "Tidak ada info",
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        get_client_details: tool({
            description:
                "Ambil profil lengkap klien: data pribadi, semua polis, dan riwayat klaim terbaru. Gunakan client_id dari hasil search_clients.",
            parameters: z.object({
                client_id: z.string().describe("ID unik klien"),
            }),
            execute: async ({ client_id }) => {
                const db = await dbPool.connect();
                try {
                    const [clientRes, claimsRes] = await Promise.all([
                        db.query<{
                            full_name: string; phone_number: string; address: string;
                            birth_date: string; client_status: string;
                            contract_number: string; policy_status: string;
                            next_due_date: string; contract_product: string;
                        }>(`
                            SELECT
                                p.full_name, p.phone_number, p.address, p.birth_date,
                                c.status AS client_status,
                                ct.contract_number, ct.status AS policy_status,
                                ct.next_due_date, ct.contract_product
                            FROM client c
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN contract ct ON c.client_id = ct.client_id
                            WHERE c.agent_id = $1 AND c.client_id = $2
                        `, [userId, client_id]),

                        db.query<{
                            claim_number: string; stage: string; status: string;
                            total_amount: string; claim_date: string; disease_name: string;
                        }>(`
                            SELECT
                                cl.claim_number, cl.stage, cl.status,
                                cl.total_amount, cl.claim_date,
                                d.disease_name
                            FROM claim cl
                            LEFT JOIN disease d ON cl.disease_id = d.disease_id
                            WHERE cl.client_id = $1
                            ORDER BY cl.claim_date DESC
                            LIMIT 5
                        `, [client_id]),
                    ]);

                    if (clientRes.rows.length === 0) {
                        return { found: false, message: "Klien tidak ditemukan" };
                    }

                    const r = clientRes.rows[0];
                    const age = r.birth_date
                        ? Math.floor((Date.now() - new Date(r.birth_date).getTime()) / (365.25 * 86400000))
                        : null;

                    return {
                        found: true,
                        profile: {
                            name: r.full_name,
                            phone: r.phone_number || "Tidak tersedia",
                            address: r.address || "Tidak tersedia",
                            age: age ? `${age} tahun` : "Tidak ada data",
                            birthday: r.birth_date
                                ? new Date(r.birth_date).toLocaleDateString("id-ID")
                                : "Tidak ada data",
                            status: r.client_status,
                        },
                        policies: clientRes.rows
                            .filter(row => row.contract_number)
                            .map(row => ({
                                number: row.contract_number,
                                product: row.contract_product || "Tidak diketahui",
                                status: row.policy_status,
                                next_due: row.next_due_date
                                    ? new Date(row.next_due_date).toLocaleDateString("id-ID")
                                    : "Tidak ada",
                            })),
                        recent_claims: claimsRes.rows.map(cl => ({
                            number: cl.claim_number,
                            disease: cl.disease_name || "Tidak diketahui",
                            date: new Date(cl.claim_date).toLocaleDateString("id-ID"),
                            stage: cl.stage,
                            status: cl.status,
                            amount: cl.total_amount
                                ? `Rp ${Number(cl.total_amount).toLocaleString("id-ID")}`
                                : "Belum diisi",
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        get_claim_details: tool({
            description:
                "Ambil detail lengkap sebuah klaim berdasarkan nomor klaim (format CLM-XXXX-XXXXX) atau sebagian nomor. Termasuk status, timeline, dan tindakan yang diperlukan.",
            parameters: z.object({
                claim_number: z.string().describe("Nomor klaim, contoh: CLM-2026-00001"),
            }),
            execute: async ({ claim_number }) => {
                const db = await dbPool.connect();
                try {
                    const [claimRes, timelineRes] = await Promise.all([
                        db.query<{
                            claim_id: string; claim_number: string; stage: string; status: string;
                            total_amount: string; claim_date: string; notes: string;
                            client_name: string; hospital_name: string; disease_name: string;
                            log_number: string; log_issued_at: string; log_sent_to_hospital_at: string;
                            required_action_by_role: string; benefit_type: string;
                        }>(`
                            SELECT
                                cl.claim_id, cl.claim_number, cl.stage, cl.status,
                                cl.total_amount, cl.claim_date, cl.agent_notes AS notes,
                                cl.log_number, cl.log_issued_at, cl.log_sent_to_hospital_at,
                                cl.required_action_by_role, cl.benefit_type,
                                p.full_name AS client_name,
                                h.name AS hospital_name,
                                d.disease_name
                            FROM claim cl
                            JOIN client c ON cl.client_id = c.client_id
                            JOIN person p ON c.person_id = p.person_id
                            LEFT JOIN hospital h ON cl.hospital_id = h.hospital_id
                            LEFT JOIN disease d ON cl.disease_id = d.disease_id
                            WHERE cl.agent_id = $1
                              AND cl.claim_number ILIKE $2
                            LIMIT 1
                        `, [userId, `%${claim_number}%`]),

                        db.query<{ event_type: string; created_at: string }>(`
                            SELECT event_type, created_at
                            FROM claim_timeline
                            WHERE claim_id = (
                                SELECT claim_id FROM claim
                                WHERE agent_id = $1 AND claim_number ILIKE $2
                                LIMIT 1
                            )
                            ORDER BY created_at DESC
                            LIMIT 8
                        `, [userId, `%${claim_number}%`]),
                    ]);

                    if (claimRes.rows.length === 0) {
                        return { found: false, message: `Klaim "${claim_number}" tidak ditemukan` };
                    }

                    const r = claimRes.rows[0];
                    const daysSinceCreated = Math.floor(
                        (Date.now() - new Date(r.claim_date).getTime()) / 86400000
                    );

                    // Determine next recommended action based on stage
                    const nextActionMap: Record<string, string> = {
                        DRAFT: "Lengkapi data klaim dan ajukan untuk diproses",
                        PENDING_LOG: "Menunggu penerbitan surat LOG dari agensi",
                        LOG_ISSUED: "LOG sudah terbit — kirimkan ke rumah sakit sekarang",
                        LOG_SENT_TO_HOSPITAL: "Tunggu konfirmasi penerimaan dari rumah sakit",
                        PENDING_HOSPITAL_INPUT: "Rumah sakit sedang melengkapi data — follow up jika >3 hari",
                        PENDING_AGENT_REVIEW: "Periksa dan lengkapi dokumen dari rumah sakit, lalu submit ke agensi",
                        SUBMITTED_TO_AGENCY: "Klaim sedang direview agensi — tidak ada tindakan diperlukan",
                        APPROVED: "Klaim disetujui",
                        REJECTED: "Klaim ditolak — konsultasikan opsi banding",
                    };

                    return {
                        found: true,
                        claim: {
                            number: r.claim_number,
                            client: r.client_name,
                            hospital: r.hospital_name || "Tidak diisi",
                            disease: r.disease_name || "Tidak diisi",
                            stage: r.stage,
                            status: r.status,
                            benefit_type: r.benefit_type || "Tidak diisi",
                            amount: r.total_amount
                                ? `Rp ${Number(r.total_amount).toLocaleString("id-ID")}`
                                : "Belum diisi",
                            filed_date: new Date(r.claim_date).toLocaleDateString("id-ID"),
                            days_elapsed: `${daysSinceCreated} hari sejak pengajuan`,
                            log_number: r.log_number || "Belum terbit",
                            log_sent: r.log_sent_to_hospital_at
                                ? new Date(r.log_sent_to_hospital_at).toLocaleDateString("id-ID")
                                : "Belum dikirim",
                            agent_notes: r.notes || "Tidak ada catatan",
                            action_required_by: r.required_action_by_role || "Tidak diketahui",
                            recommended_next_action: nextActionMap[r.stage] ?? "Hubungi agensi untuk informasi lebih lanjut",
                        },
                        recent_timeline: timelineRes.rows.map(t => ({
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
            description:
                "Cari rumah sakit di jaringan mitra berdasarkan kota, negara, atau spesialisasi. Berguna ketika agen perlu merujuk klien ke rumah sakit yang tepat.",
            parameters: z.object({
                query: z.string().describe("Kota, nama RS, atau spesialisasi yang dicari"),
                country: z.string().optional().describe("Filter negara: Indonesia, Malaysia, Singapore"),
            }),
            execute: async ({ query, country }) => {
                const db = await dbPool.connect();
                try {
                    const params: string[] = [`%${query}%`];
                    let countryClause = "";
                    if (country) {
                        params.push(country);
                        countryClause = `AND h.country ILIKE $${params.length}`;
                    }

                    const res = await db.query<{
                        hospital_id: string; name: string; city: string; country: string;
                        tier: string; specializations: string[]; is_partner: boolean;
                        emergency_24h: boolean; avg_rating: string;
                    }>(`
                        SELECT
                            h.hospital_id, h.name, h.city, h.country, h.tier,
                            h.specializations, h.is_partner, h.emergency_24h, h.avg_rating
                        FROM hospital h
                        WHERE (
                            h.name ILIKE $1
                            OR h.city ILIKE $1
                            OR h.specializations::text ILIKE $1
                        )
                        ${countryClause}
                        ORDER BY h.is_partner DESC, h.avg_rating DESC NULLS LAST
                        LIMIT 6
                    `, params);

                    if (res.rows.length === 0) {
                        return { found: false, message: `Tidak ada rumah sakit yang cocok dengan "${query}"` };
                    }

                    return {
                        found: true,
                        hospitals: res.rows.map(r => ({
                            name: r.name,
                            city: `${r.city}, ${r.country}`,
                            tier: r.tier,
                            is_partner: r.is_partner,
                            emergency_24h: r.emergency_24h,
                            specializations: r.specializations?.slice(0, 4) ?? [],
                            rating: r.avg_rating ? Number(r.avg_rating).toFixed(1) : "Belum ada rating",
                        })),
                    };
                } finally {
                    db.release();
                }
            },
        }),

        draft_whatsapp: tool({
            description:
                "Buat draf pesan WhatsApp yang personal dan hangat untuk dikirim ke klien. Gunakan ini ketika agen meminta draf pesan.",
            parameters: z.object({
                client_name: z.string().describe("Nama klien penerima"),
                message_type: z.enum([
                    "PREMIUM_REMINDER",
                    "BIRTHDAY_GREETING",
                    "CLAIM_UPDATE",
                    "DOCUMENT_REQUEST",
                    "FOLLOW_UP",
                    "GENERAL",
                ]).describe("Jenis pesan yang ingin dibuat"),
                context: z.string().optional().describe("Konteks tambahan, misalnya: nomor polis, nama penyakit, jumlah premi"),
            }),
            execute: async ({ client_name, message_type, context }) => {
                // This tool returns structured data; the AI composes the actual draft
                return {
                    client_name,
                    message_type,
                    context: context || "",
                    instruction: `Tulis draf WhatsApp untuk ${client_name}. Jenis: ${message_type}. ${context ? `Konteks: ${context}` : ""}. Langsung keluarkan teks pesannya saja, tanpa pengantar. Gunakan bahasa yang hangat, natural, tidak kaku. Sertakan sapaan, isi pesan, dan call-to-action yang jelas.`,
                };
            },
        }),

        analyze_claim_risk: tool({
            description:
                "Analisis risiko sebuah klaim: apakah ada dokumen yang mungkin kurang, potensi penolakan, atau hal-hal yang perlu diperhatikan. Gunakan claim_number yang valid.",
            parameters: z.object({
                claim_number: z.string().describe("Nomor klaim yang akan dianalisis"),
            }),
            execute: async ({ claim_number }) => {
                const db = await dbPool.connect();
                try {
                    const res = await db.query<{
                        claim_id: string; stage: string; status: string;
                        total_amount: string; benefit_type: string; care_cause: string;
                        symptom_onset_date: string; previous_treatment: string;
                        disease_name: string; claim_date: string; log_number: string;
                        doc_count: string;
                    }>(`
                        SELECT
                            cl.claim_id, cl.stage, cl.status, cl.total_amount,
                            cl.benefit_type, cl.care_cause, cl.symptom_onset_date,
                            cl.previous_treatment, d.disease_name, cl.claim_date,
                            cl.log_number,
                            COALESCE(
                                (SELECT COUNT(*) FROM claim_document cd WHERE cd.claim_id = cl.claim_id),
                                0
                            ) AS doc_count
                        FROM claim cl
                        LEFT JOIN disease d ON cl.disease_id = d.disease_id
                        WHERE cl.agent_id = $1 AND cl.claim_number ILIKE $2
                        LIMIT 1
                    `, [userId, `%${claim_number}%`]);

                    if (res.rows.length === 0) {
                        return { found: false };
                    }

                    const r = res.rows[0];
                    const risks: string[] = [];
                    const recommendations: string[] = [];

                    if (!r.benefit_type) {
                        risks.push("Jenis manfaat (benefit_type) belum diisi");
                        recommendations.push("Isi jenis manfaat sesuai polis klien");
                    }
                    if (!r.care_cause) {
                        risks.push("Penyebab perawatan belum diisi");
                        recommendations.push("Lengkapi kolom penyebab perawatan/meninggal");
                    }
                    if (!r.symptom_onset_date) {
                        risks.push("Tanggal awal gejala belum diisi — bisa mempengaruhi coverage period");
                        recommendations.push("Isi tanggal pertama kali gejala muncul dari keterangan dokter");
                    }
                    if (Number(r.doc_count) < 2) {
                        risks.push(`Dokumen pendukung sangat sedikit (${r.doc_count} file) — biasanya perlu minimal 3-5 dokumen`);
                        recommendations.push("Upload: surat rujukan dokter, resume medis, kwitansi RS, dan foto KTP klien");
                    }
                    if (!r.log_number && !["DRAFT", "PENDING_LOG"].includes(r.stage)) {
                        risks.push("Nomor LOG belum ada padahal klaim sudah melewati tahap awal");
                        recommendations.push("Hubungi agensi untuk memastikan LOG sudah diterbitkan");
                    }
                    if (r.previous_treatment) {
                        risks.push("Ada riwayat perawatan sebelumnya — potensi pre-existing condition exclusion");
                        recommendations.push("Pastikan kondisi ini tidak termasuk dalam pengecualian polis");
                    }

                    const riskLevel = risks.length === 0 ? "RENDAH" : risks.length <= 2 ? "SEDANG" : "TINGGI";

                    return {
                        found: true,
                        claim_number,
                        risk_level: riskLevel,
                        total_risks: risks.length,
                        risks,
                        recommendations,
                        current_docs: Number(r.doc_count),
                        disease: r.disease_name || "Tidak diisi",
                        stage: r.stage,
                    };
                } finally {
                    db.release();
                }
            },
        }),
    };
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(agentName: string, currentPage: string): string {
    const pageContextMap: Record<string, string> = {
        "/agent": "Agen sedang di halaman Dashboard",
        "/agent/claims": "Agen sedang di halaman daftar Klaim",
        "/agent/clients": "Agen sedang di halaman daftar Klien",
        "/agent/appointments": "Agen sedang di halaman Janji Temu",
        "/agent/reminders": "Agen sedang di halaman Pengingat",
        "/agent/requests": "Agen sedang di halaman Permintaan dari Rumah Sakit",
        "/agent/network": "Agen sedang di halaman Jaringan Rumah Sakit",
        "/agent/referral": "Agen sedang di halaman Referral",
    };

    const pageCtx = Object.entries(pageContextMap).find(([path]) =>
        currentPage.includes(path.replace("/agent", ""))
    )?.[1] ?? "Agen sedang menggunakan platform";

    return `Kamu adalah **Natalie**, asisten agentic cerdas khusus untuk Agen Asuransi bernama **${agentName}**.

## Identitasmu
- Kamu BUKAN sekadar chatbot. Kamu adalah mitra kerja proaktif yang bisa **mengakses data real-time** melalui tools yang tersedia.
- Kamu fasih dalam semua aspek asuransi jiwa di Indonesia: klaim, LOG (Letter of Guarantee/Guarantee Of Letter), polis, premi, manfaat rawat inap, kondisi kritis, dan prosedur agensi.
- Bahasamu: natural, hangat, efisien. Seperti rekan kerja yang sangat kompeten — bukan robot korporat.

## Konteks saat ini
${pageCtx}.

## Cara kerjamu
1. **Gunakan tools** untuk mengambil data real — jangan mengarang data klien, klaim, atau RS.
2. Untuk briefing harian: panggil **get_daily_briefing** dulu, lalu sajikan hasilnya secara naratif dan terstruktur.
3. Untuk pencarian klien: gunakan **search_clients**, lalu **get_client_details** untuk detail lengkap.
4. Untuk analisis klaim: gunakan **get_claim_details** + **analyze_claim_risk** untuk gambaran menyeluruh.
5. Untuk draf WA: gunakan **draft_whatsapp** untuk mendapatkan konteks, lalu tulis drafnya.
6. Untuk rekomendasi RS: gunakan **find_hospitals**.

## Aturan output
- Saat menulis draf pesan (WA, email, surat): **langsung keluarkan teksnya saja** — tanpa kata pengantar seperti "Berikut drafnya:" atau penutup seperti "Semoga membantu!".
- Saat menyajikan data: gunakan format yang terstruktur dan mudah dibaca. Gunakan bullet point, bukan tabel.
- **Jangan pernah mengungkapkan NIK, nomor KTP, atau password** siapapun — ini tidak diperlukan untuk pekerjaan agen.
- Jika diminta informasi yang tidak ada di tools, katakan dengan jujur dan tawarkan alternatif.
- Emoji: gunakan secukupnya, hanya jika menambah kejelasan. Tidak perlu berlebihan.

## Prioritas harianmu untuk ${agentName}
Selalu fokus pada: klaim yang macet, premi yang akan jatuh tempo, dan dokumen yang kurang. Ini tiga hal yang paling kritis untuk performa agen.`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const session = await getSession();
    if (!session?.userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;
    const pageContext: string = body.pageContext ?? body.data?.pageContext ?? "";
    const userId = session.userId;

    const profile = await findUserWithProfile(userId).catch(() => null);
    const agentName = profile?.full_name || "Agen";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await streamText({
        model: anthropic("claude-sonnet-4-6") as any,
        system: buildSystemPrompt(agentName, pageContext || ""),
        messages,
        tools: buildTools(userId),
    });

    return result.toAIStreamResponse();
}
