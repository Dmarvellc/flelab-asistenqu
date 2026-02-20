import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgentRequestsPageClient from "./client-page";
import { getAgentRequests } from "@/services/agent-requests";

export default async function AgentRequestsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialRequests = await getAgentRequests(userId).catch(() => []);

    return <AgentRequestsPageClient initialRequests={initialRequests as any} />;
}
