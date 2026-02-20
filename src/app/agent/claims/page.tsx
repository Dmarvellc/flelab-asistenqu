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

    return <AgentClaimsPageClient initialClaims={initialClaims as any} />;
}
