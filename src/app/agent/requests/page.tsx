import { redirect } from "next/navigation";
import AgentRequestsPageClient from "./client-page";
import { getAgentRequests } from "@/services/agent-requests";
import { getSession } from "@/lib/auth";

export default async function AgentRequestsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/agent/login");
    }
    const userId = session.userId;

    const initialRequests = await getAgentRequests(userId).catch(() => []);

    return <AgentRequestsPageClient initialRequests={initialRequests as any} />;
}
