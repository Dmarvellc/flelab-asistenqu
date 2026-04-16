import { redirect } from "next/navigation";
import AgentClientsPageClient from "./client-page";
import { getAgentClients } from "@/services/agent-clients";
import { getSession } from "@/lib/auth";

export default async function AgentClientsPage() {
    const session = await getSession();
    if (!session) {
        redirect("/agent/login");
    }
    const userId = session.userId;

    const initialClients = await getAgentClients(userId).catch(() => []);

    return <AgentClientsPageClient initialClients={initialClients as any} />;
}
