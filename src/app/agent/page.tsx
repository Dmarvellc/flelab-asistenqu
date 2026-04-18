import { redirect } from "next/navigation"
import { getAgentClaims } from "@/services/claims"
import { getAgentMetrics } from "@/services/agent-metrics"
import { DashboardClient } from "./dashboard-client"
import { findUserWithProfile } from "@/lib/auth-queries"
import { getSession } from "@/lib/auth"
import { dbPool } from "@/lib/db"

async function getInsuranceName(userId: string): Promise<string | null> {
  try {
    const res = await dbPool.query(`
      SELECT i.insurance_name
      FROM public.agent a
      JOIN public.insurance i ON a.insurance_id = i.insurance_id
      WHERE a.agent_id = $1
    `, [userId]);
    return res.rows[0]?.insurance_name ?? null;
  } catch {
    return null;
  }
}

export default async function AgentDashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect("/agent/login")
  }
  const userId = session.userId

  // Fetch all data in parallel
  const [metrics, claims, userProfile, insuranceName] = await Promise.all([
    getAgentMetrics(userId).catch(() => ({
      activeClients: 0,
      pendingContracts: 0,
      totalClaims: 0,
      points: 0,
      chartData: []
    })),
    getAgentClaims(userId).catch(() => []),
    findUserWithProfile(userId).catch(() => null),
    getInsuranceName(userId),
  ]);

  const agentName = userProfile?.full_name || "Agent";

  return <DashboardClient metrics={metrics} claims={claims} initialAgentName={agentName} insuranceName={insuranceName} />;
}

