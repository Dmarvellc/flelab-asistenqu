import { I18nProvider } from "@/components/providers/i18n-provider";
import { AgencyBrandingProvider } from "@/components/providers/agency-branding-provider";
import { AgentLayoutClient } from "@/app/agent/client-layout";
import { getAgentMetrics } from "@/services/agent-metrics";
import { findUserWithProfile } from "@/lib/auth-queries";
import { getSession } from "@/lib/auth";
import { resolveAgencyBySlug } from "@/lib/agency-resolver";
import { notFound, redirect } from "next/navigation";

export default async function DynamicAgentLayout(props: {
  children: React.ReactNode;
  params: Promise<{ agencySlug: string }>;
}) {
  const { agencySlug } = await props.params;

  // Resolve agency branding
  const branding = await resolveAgencyBySlug(agencySlug);
  if (!branding) {
    notFound();
  }

  const session = await getSession({ portal: "agent" });

  if (!session) {
    redirect(`/${agencySlug}/agent/login`);
  }

  // Verify the session's agency slug matches the URL slug
  if (session.agencySlug && session.agencySlug !== agencySlug) {
    redirect(`/${session.agencySlug}/agent`);
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
        })),
        findUserWithProfile(userId).catch(() => null),
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
      <AgencyBrandingProvider
        branding={{
          agencyId: branding.agencyId,
          slug: branding.slug,
          name: branding.name,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
          sidebarBg: branding.sidebarBg,
          sidebarText: branding.sidebarText,
          loginBg: branding.loginBg,
        }}
      >
        <AgentLayoutClient initialBadges={initialBadges} serverUserName={serverUserName}>
          {props.children}
        </AgentLayoutClient>
      </AgencyBrandingProvider>
    </I18nProvider>
  );
}
