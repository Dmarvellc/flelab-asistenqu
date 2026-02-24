import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_admin_agency_user_id")?.value || cookieStore.get("app_user_id")?.value;

    let systemContext = `Anda adalah "AI Commander" untuk dashboard Admin Agensi Asuransi di platform AsistenQu. Peran Anda adalah mendampingi Pimpinan/Admin Agensi dalam mengambil keputusan, menganalisis data, memberikan motivasi kepada tim agen, atau memahami aturan-aturan asuransi.`;

    if (userIdCookie) {
        const client = await dbPool.connect();
        try {
            const userRes = await client.query("SELECT * FROM app_user u LEFT JOIN agency a ON u.agency_id = a.agency_id WHERE user_id = $1", [userIdCookie]);
            if (userRes.rows.length > 0) {
                const user = userRes.rows[0];
                const agencyId = user.agency_id;

                systemContext += `\nNama Pimpinan/Admin: ${user.full_name}. Di Agensi: ${user.name || 'Agensi Asuransi'}`;

                if (agencyId) {
                    const agentsRes = await client.query("SELECT COUNT(*) FROM app_user WHERE role = 'agent' AND agency_id = $1", [agencyId]);
                    const policiesRes = await client.query(`
                        SELECT COUNT(*) FROM client c 
                        JOIN app_user au ON c.agent_id = au.user_id 
                        WHERE au.agency_id = $1
                    `, [agencyId]);

                    systemContext += `\n\n=== Data Ringkasan Agensi (REAL-TIME DATABASE) ===
- Total Agen: ${agentsRes.rows[0].count} agen
- Total Klien/Polis di Agensi: ${policiesRes.rows[0].count} klien

Gunakan informasi ini jika ditanya rangkuman/performa. Jika mereka menanyakan detail lebih dari yang Anda ketahui, katakan secara diplomatis bahwa Anda adalah komandan operasional di masa percobaan.`;
                }
            }
        } catch (e) {
            console.error("AI Agency context error", e);
        } finally {
            client.release();
        }
    }

    systemContext += `\nBerikan respons eksekutif, strategis, dan motivasional. Jika diminta untuk membuatkan email motivasi atau analisis performa, gunakan bahasa profesional dan memukau (format Markdown yang rapi).`;

    const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemContext,
        messages,
    });

    return result.toDataStreamResponse();
}
