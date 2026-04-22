import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { ClaimsDataTable } from "@/components/admin-agency/claims-data-table"
import { getAgencyClaims } from "@/services/admin-agency"
import Link from "next/link"
import { dbPool } from "@/lib/db";
import { cached, CacheKeys, TTL } from "@/lib/cache";
import { Users, UserCog, Building2, ShieldCheck, ArrowRightLeft, FileText, ArrowRight } from "lucide-react";
import { Claim } from "@/lib/claims-data";

interface AgencyDashboardData {
  agencyName: string;
  agentsCount: number;
  hospitalsCount: number;
  policiesCount: number;
  pendingTransfersCount: number;
  pendingClaimsCount: number;
  claims: Claim[];
}

async function fetchAgencyDashboardData(userId: string): Promise<AgencyDashboardData> {
  const empty: AgencyDashboardData = {
    agencyName: "Dashboard Agency",
    agentsCount: 0,
    hospitalsCount: 0,
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

    // All counts + claims in parallel (was sequential before).
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
      hospitalsCount: 0,
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
  const userId = await getAdminAgencyUserIdFromCookies();

  const data: AgencyDashboardData = userId
    ? await cached(
        CacheKeys.agencyDashboard(userId),
        TTL.MEDIUM,
        () => fetchAgencyDashboardData(userId),
        { fallback: {
            agencyName: "Dashboard Agency",
            agentsCount: 0, hospitalsCount: 0, policiesCount: 0,
            pendingTransfersCount: 0, pendingClaimsCount: 0, claims: [],
          } as AgencyDashboardData
        }
      )
    : {
        agencyName: "Dashboard Agency",
        agentsCount: 0, hospitalsCount: 0, policiesCount: 0,
        pendingTransfersCount: 0, pendingClaimsCount: 0, claims: [],
      };

  const { agencyName, agentsCount, hospitalsCount, policiesCount,
          pendingTransfersCount, pendingClaimsCount, claims } = data;

  const stats = [
    { label: "Total Agen", value: agentsCount, icon: Users, href: "/admin-agency/agents" },
    { label: "Rumah Sakit", value: hospitalsCount, icon: Building2, href: "#" },
    { label: "Polis Aktif", value: policiesCount, icon: ShieldCheck, href: "/admin-agency/clients" }
  ];

  return (
    <div className="flex flex-col gap-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-gray-100">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-gray-900 mt-2">{agencyName}</h1>
          <p className="mt-1 text-base text-gray-500">Pantau performa agensi, perkembangan agen, dan klaim secara keseluruhan.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          <Link href="/admin-agency/agents">
            <button className="bg-gray-900 hover:bg-black text-white text-[14px] font-semibold h-11 px-5 rounded-xl transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Undang Agen
            </button>
          </Link>
          <Link href="/admin-agency/team">
            <button className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 text-[14px] font-semibold h-11 px-5 rounded-xl transition-all inline-flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Staff Internal
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />
            <div className="relative z-10 flex justify-between items-start mb-8">
              <div className="p-4 rounded-2xl bg-gray-50 text-gray-900 transition-colors duration-300 border border-gray-100 group-hover:bg-white group-hover:shadow-sm">
                <stat.icon className="w-6 h-6" />
              </div>
              {stat.href !== "#" && (
                <Link href={stat.href} className="text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 group/link cursor-pointer">
                  Lihat <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
            <div>
              <div className="relative z-10 text-[40px] font-bold text-gray-900 tracking-tight tabular-nums mb-3 leading-none">{stat.value}</div>
              <p className="relative z-10 text-base font-medium text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action required cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex justify-between items-start mb-8">
            <div className="p-4 rounded-2xl bg-gray-50 text-gray-600 border border-gray-100 group-hover:bg-gray-100 transition-colors">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <div className="text-[40px] font-bold text-gray-900 tracking-tight tabular-nums mb-3 leading-none">{pendingTransfersCount}</div>
              <p className="text-base font-medium text-gray-500">Permintaan Transfer (Menunggu)</p>
            </div>
            <Link href="/admin-agency/transfers" className="text-sm font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
              Tinjau Transfer
            </Link>
          </div>
        </div>

        <div className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50/50 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex justify-between items-start mb-8">
            <div className="p-4 rounded-2xl bg-gray-900 text-white border border-gray-800 shadow-sm group-hover:bg-black transition-colors">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <div className="text-[40px] font-bold text-gray-900 tracking-tight tabular-nums mb-3 leading-none">{pendingClaimsCount}</div>
              <p className="text-base font-medium text-gray-500">Klaim Perlu Ditinjau</p>
            </div>
            <Link href="/admin-agency/claims" className="text-sm font-semibold text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors">
              Validasi Klaim
            </Link>
          </div>
        </div>
      </div>

      {/* Claims data table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <ClaimsDataTable claims={claims} role="admin_agency" limit={10} showViewAll />
      </div>

    </div>
  );
}
