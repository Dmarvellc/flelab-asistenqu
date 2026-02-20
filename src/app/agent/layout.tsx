import { cookies } from "next/headers";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AgentLayoutClient } from "./client-layout";
import { getAgentMetrics } from "@/services/agent-metrics";
import { findUserWithProfile } from "@/lib/auth-queries";

export default async function AgentLayout(props: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_agent_user_id")?.value ?? cookieStore.get("app_user_id")?.value;

  let initialBadges = { pendingContracts: 0, totalClaims: 0 };
  let serverUserName: string | null = null;

  if (userId && userId.trim() !== "") {
    try {
      const [metrics, profile] = await Promise.all([
        getAgentMetrics(userId).catch(() => ({
          activeClients: 0,
          pendingContracts: 0,
          totalClaims: 0,
          points: 0,
        })),
        findUserWithProfile(userId).catch(() => null)
      ]);

      initialBadges = {
        pendingContracts: metrics.pendingContracts || 0,
        totalClaims: metrics.totalClaims || 0,
      };

      serverUserName = profile?.full_name || profile?.email || null;
    } catch (e) {
      console.error("Failed to fetch initial layout server stats", e);
    }
  }

  return (
    <I18nProvider>
      <AgentLayoutClient initialBadges={initialBadges} serverUserName={serverUserName}>
        {props.children}
      </AgentLayoutClient>
    </I18nProvider>
  );
}
