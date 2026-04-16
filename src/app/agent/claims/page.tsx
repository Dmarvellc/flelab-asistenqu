import { redirect } from "next/navigation";
import { getAgentClaims } from "@/services/claims";
import AgentClaimsPageClient from "./client-page";
import { getSession } from "@/lib/auth";

export default async function AgentClaimsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/agent/login");
    }
    const userId = session.userId;

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
