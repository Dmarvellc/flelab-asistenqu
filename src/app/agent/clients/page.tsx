import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgentClientsPageClient from "./client-page";
import { getAgentClients } from "@/services/agent-clients";

import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";

export default async function AgentClientsPage() {
    const userId = await getAgentUserIdFromCookies();

    if (!userId || userId.trim() === "") {
        redirect("/agent/login");
    }

    const initialClients = await getAgentClients(userId).catch(() => []);

    return <AgentClientsPageClient initialClients={initialClients as any} />;
}
