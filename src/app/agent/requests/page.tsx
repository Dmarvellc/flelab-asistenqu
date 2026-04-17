import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgentRequestsPageClient from "./client-page";
import { getAgentRequests } from "@/services/agent-requests";

import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";

export default async function AgentRequestsPage() {
    const userId = await getAgentUserIdFromCookies();

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialRequests = await getAgentRequests(userId).catch(() => []);

    return <AgentRequestsPageClient initialRequests={initialRequests as any} />;
}
