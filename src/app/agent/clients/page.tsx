import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgentClientsPageClient from "./client-page";
import { getAgentClients } from "@/services/agent-clients";

export default async function AgentClientsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value;

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialClients = await getAgentClients(userId).catch(() => []);

    return <AgentClientsPageClient initialClients={initialClients as any} />;
}
