import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAgentClaims } from "@/services/claims"
import { getAgentMetrics } from "@/services/agent-metrics"
import { DashboardClient } from "./dashboard-client"
import { findUserWithProfile } from "@/lib/auth-queries"

import { getAgentUserIdFromCookies } from "@/lib/auth-cookies"

export default async function AgentDashboardPage() {
  const userId = await getAgentUserIdFromCookies()

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

  let insuranceName = null;
  try {
    const { dbPool } = await import("@/lib/db");
    const res = await dbPool.query(`
      SELECT i.insurance_name 
      FROM public.agent a 
      JOIN public.insurance i ON a.insurance_id = i.insurance_id 
      WHERE a.agent_id = $1
    `, [userId]);
    if (res.rows.length > 0) {
      insuranceName = res.rows[0].insurance_name;
    }
  } catch (e) {
    console.error("Failed to fetch insurance name:", e);
  }

  const agentName = userProfile?.full_name || "Agent";

  return <DashboardClient metrics={metrics} claims={claims} initialAgentName={agentName} insuranceName={insuranceName} />;
}

