import { redirect } from "next/navigation"
import { getAgentClaims } from "@/services/claims"
import { getAgentMetrics } from "@/services/agent-metrics"
import { DashboardClient } from "@/app/agent/dashboard-client"
import { findUserWithProfile } from "@/lib/auth-queries"
import { getSession } from "@/lib/auth"

export default async function DynamicAgentDashboardPage(props: {
  params: Promise<{ agencySlug: string }>
}) {
  const { agencySlug } = await props.params
  const session = await getSession()
  if (!session) {
    redirect(`/${agencySlug}/agent/login`)
  }
  const userId = session.userId

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
