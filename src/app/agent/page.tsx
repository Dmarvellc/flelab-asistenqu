import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAgentClaims } from "@/services/claims"
import { getAgentMetrics } from "@/services/agent-metrics"
import { DashboardClient } from "./dashboard-client"
import { findUserWithProfile } from "@/lib/auth-queries"

export default async function AgentDashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value

  // Cookie missing or empty → not logged in, redirect to login
  if (!userId || userId.trim() === "") {
    redirect("/agent/login")
  }

  // Fetch metrics & claims in parallel; never crash the whole page
  const [metrics, claims, userProfile] = await Promise.all([
    getAgentMetrics(userId).catch(() => ({
      activeClients: 0,
      pendingContracts: 0,
      totalClaims: 0,
      points: 0,
      chartData: []
    })),
    getAgentClaims(userId).catch(() => []),
    findUserWithProfile(userId).catch(() => null),
  ]);

  const agentName = userProfile?.full_name || "Agent";

  return <DashboardClient metrics={metrics} claims={claims} initialAgentName={agentName} />;
}

