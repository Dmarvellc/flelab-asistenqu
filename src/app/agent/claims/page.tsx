import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAgentClaims } from "@/services/claims";
import AgentClaimsPageClient from "./client-page";

export default async function AgentClaimsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialClaims = await getAgentClaims(userId).catch(() => []);

    // Fetch agency template
    let template_url: string | null = null;
    try {
        const { dbPool } = await import("@/lib/db");
        const res = await dbPool.query(`
            SELECT a.claim_form_url 
            FROM public.app_user u
            JOIN public.agency a ON u.agency_id = a.agency_id
            WHERE u.user_id = $1
        `, [userId]);
        if (res.rows.length > 0) {
            template_url = res.rows[0].claim_form_url;
        }
    } catch (e) {
        console.error("Failed to fetch agency template:", e);
    }

    return <AgentClaimsPageClient initialClaims={initialClaims as any} agencyTemplateUrl={template_url} />;
}
