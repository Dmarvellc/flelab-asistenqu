import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClaimsDataTable } from "@/components/admin-agency/claims-data-table"
import { getAgencyClaims } from "@/services/admin-agency"
import Link from "next/link"
import { dbPool } from "@/lib/db";
import { cached, CacheKeys, TTL } from "@/lib/cache";
import { Users, UserCog, ShieldCheck, ArrowRightLeft, FileText } from "lucide-react";
import { Claim } from "@/lib/claims-data";
import { PageShell, PageHeader, StatCard, StatsGrid } from "@/components/dashboard/page-shell";

interface AgencyDashboardData {
  agencyName: string;
  agentsCount: number;
  policiesCount: number;
  pendingTransfersCount: number;
  pendingClaimsCount: number;
  claims: Claim[];
}

async function fetchAgencyDashboardData(userId: string): Promise<AgencyDashboardData> {
  const empty: AgencyDashboardData = {
    agencyName: "Dashboard Agency",
    agentsCount: 0,
    policiesCount: 0,
    pendingTransfersCount: 0,
    pendingClaimsCount: 0,
    claims: [],
  };

  const client = await dbPool.connect();
  try {
    const userRes = await client.query(`
      SELECT a.name, a.agency_id
      FROM public.app_user au
      JOIN public.agency a ON au.agency_id = a.agency_id
      WHERE au.user_id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return empty;

    const agencyName = userRes.rows[0].name as string;
    const agencyId = userRes.rows[0].agency_id as string;

    const [claims, agentsRes, policiesRes, transfersRes, pendingClaimsRes] = await Promise.all([
      getAgencyClaims(agencyId),
      client.query(
        "SELECT COUNT(*)::int AS count FROM public.app_user WHERE role = 'agent' AND agency_id = $1",
        [agencyId]
      ),
      client.query(`
        SELECT COUNT(*)::int AS count FROM public.client c
        JOIN public.app_user au ON c.agent_id = au.user_id
        WHERE au.agency_id = $1
      `, [agencyId]),
      client.query(
        "SELECT COUNT(*)::int AS count FROM public.agency_transfer_request WHERE status = 'PENDING' AND (to_agency_id = $1 OR from_agency_id = $1)",
        [agencyId]
      ),
      client.query(`
        SELECT COUNT(*)::int AS count FROM public.claim c
        JOIN public.app_user au ON c.created_by_user_id = au.user_id
        WHERE au.agency_id = $1 AND c.stage = 'SUBMITTED_TO_AGENCY'
      `, [agencyId]),
    ]);

    return {
      agencyName,
      agentsCount: agentsRes.rows[0].count ?? 0,
      policiesCount: policiesRes.rows[0].count ?? 0,
      pendingTransfersCount: transfersRes.rows[0].count ?? 0,
      pendingClaimsCount: pendingClaimsRes.rows[0].count ?? 0,
      claims,
    };
  } finally {
    client.release();
  }
}

export default async function AdminAgencyDashboardPage() {
  const session = await getSession({ portal: "admin_agency" });
  if (!session) redirect("/admin-agency/login");

  const data: AgencyDashboardData = await cached(
    CacheKeys.agencyDashboard(session.userId),
    TTL.MEDIUM,
    () => fetchAgencyDashboardData(session.userId),
    {
      fallback: {
        agencyName: "Dashboard Agency",
        agentsCount: 0, policiesCount: 0,
        pendingTransfersCount: 0, pendingClaimsCount: 0, claims: [],
      } as AgencyDashboardData
    }
  );

  const { agencyName, agentsCount, policiesCount,
          pendingTransfersCount, pendingClaimsCount, claims } = data;

  return (
    <PageShell>
      <PageHeader
        title={agencyName}
        description="Pantau performa agensi, perkembangan agen, dan klaim secara keseluruhan."
        actions={
          <>
            <Link href="/admin-agency/agents">
              <button className="bg-black hover:bg-black text-white text-sm font-medium h-9 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                Undang Agen
              </button>
            </Link>
            <Link href="/admin-agency/team">
              <button className="bg-white hover:bg-gray-50 border border-gray-200 text-black text-sm font-medium h-9 px-4 rounded-lg transition-colors inline-flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Staff Internal
              </button>
            </Link>
          </>
        }
      />

      {/* Key metrics */}
      <StatsGrid cols={3}>
        <StatCard
          label="Total Agen"
          value={agentsCount}
          icon={Users}
          href="/admin-agency/agents"
        />
        <StatCard
          label="Polis Aktif"
          value={policiesCount}
          icon={ShieldCheck}
          href="/admin-agency/clients"
        />
        <StatCard
          label="Klaim Perlu Ditinjau"
          value={pendingClaimsCount}
          icon={FileText}
          href="/admin-agency/claims"
          linkLabel="Validasi"
        />
      </StatsGrid>

      {/* Pending actions */}
      <StatsGrid cols={2}>
        <StatCard
          label="Permintaan Transfer"
          value={pendingTransfersCount}
          icon={ArrowRightLeft}
          description="Menunggu persetujuan"
          href="/admin-agency/transfers"
          linkLabel="Tinjau"
        />
        <StatCard
          label="Klaim Masuk"
          value={pendingClaimsCount}
          icon={FileText}
          description="Perlu divalidasi agensi"
          href="/admin-agency/claims"
          linkLabel="Lihat Semua"
        />
      </StatsGrid>

      {/* Claims table */}
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
        <ClaimsDataTable claims={claims} role="admin_agency" limit={10} showViewAll />
      </div>
    </PageShell>
  );
}
