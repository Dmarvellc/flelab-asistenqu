import { I18nProvider } from "@/components/providers/i18n-provider";
import { AgentLayoutClient } from "./client-layout";
import { getAgentMetrics } from "@/services/agent-metrics";
import { findUserWithProfile } from "@/lib/auth-queries";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

const AUTH_PATHS = ["/login", "/register", "/verification"];

export default async function AgentLayout(props: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublic = AUTH_PATHS.some((p) => pathname.endsWith(p));

  if (isPublic) {
    return <>{props.children}</>;
  }

  const session = await getSession({ portal: "agent" });

  if (!session) {
    redirect("/agent/login");
  }

  const userId = session.userId;

  let initialBadges = { pendingContracts: 0, pendingRequests: 0, totalClaims: 0 };
  let serverUserName: string | null = null;

  if (userId) {
    try {
      const [metrics, profile] = await Promise.all([
        getAgentMetrics(userId).catch(() => ({
          activeClients: 0,
          pendingContracts: 0,
          pendingRequests: 0,
          totalClaims: 0,
          points: 0,
          chartData: [],
        })),
        findUserWithProfile(userId).catch(() => null)
      ]);

      initialBadges = {
        pendingContracts: metrics.pendingContracts || 0,
        pendingRequests: metrics.pendingRequests || 0,
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
