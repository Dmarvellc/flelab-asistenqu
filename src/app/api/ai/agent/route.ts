import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { cookies } from "next/headers";
import { getAgentMetrics } from "@/services/agent-metrics";
import { findUserWithProfile } from "@/lib/auth-queries";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

    let systemContext = `Anda adalah "AsistenQu AI" untuk platform AsistenQu, asisten profesional bagi Agen Asuransi. Tugas Anda adalah membantu agen menyelesaikan pekerjaan mereka lebih cepat, termasuk menuliskan draf pesan, email, promosi, penjelasan produk, atau memberikan insight performa mereka.`;

    if (userId) {
        try {
            const [metrics, profile] = await Promise.all([
                getAgentMetrics(userId).catch(() => null),
                findUserWithProfile(userId).catch(() => null)
            ]);

            if (profile) {
                systemContext += `\nNama Agen yang sedang Anda bantu: ${profile.full_name || 'Agen'}. Email: ${profile.email}`;
            }

            if (metrics) {
                systemContext += `\n\n=== Data Performa Agen Saat Ini (REAL-TIME DATABASE) ===
- Total Klien Aktif: ${metrics.activeClients}
- Polis Pending: ${metrics.pendingContracts}
- Total Klaim (Semua Status): ${metrics.totalClaims}
- Poin Pencapaian: ${metrics.points}

Gunakan data metrik ini jika agen bertanya tentang status kinerja mereka.`;
            }
        } catch (e) {
            console.error("Failed to fetch agent profile/metrics for AI", e);
        }
    }

    systemContext += `\nBerikan respons dalam bahasa Indonesia yang ramah, jelas, rapi (gunakan markdown), dan profesional. Jika agen meminta membuatkan draft email atau pesan WhatsApp, buatkan yang persuasif, sopan, dan sisakan variabel blank (misal: [Nama Klien]) untuk diisi.`;

    const result = streamText({
        model: openai("gpt-4o-mini"),
        system: systemContext,
        messages,
    });

    return result.toDataStreamResponse();
}
