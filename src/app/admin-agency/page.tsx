import { ClaimsList } from "@/components/dashboard/claims-list"
import { getAllClaims } from "@/services/claims"
import Link from "next/link"
import { dbPool } from "@/lib/db";
import { Users, Building2, ShieldCheck, ArrowRightLeft, FileText, ArrowRight } from "lucide-react";

export default async function AdminAgencyDashboardPage() {
  const claims = await getAllClaims()

  const client = await dbPool.connect();
  let agentsCount = 0;
  let hospitalsCount = 0;
  let policiesCount = 0;
  let pendingTransfersCount = 0;
  let pendingClaimsCount = 0;

  try {
    const agentsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'agent'");
    agentsCount = parseInt(agentsRes.rows[0].count);

    const hospitalsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'hospital_admin'");
    hospitalsCount = parseInt(hospitalsRes.rows[0].count);

    const policiesRes = await client.query("SELECT COUNT(*) FROM public.client");
    policiesCount = parseInt(policiesRes.rows[0].count);

    const transfersRes = await client.query("SELECT COUNT(*) FROM public.agency_transfer_request WHERE status = 'PENDING'");
    pendingTransfersCount = parseInt(transfersRes.rows[0].count);

    const pendingClaimsRes = await client.query("SELECT COUNT(*) FROM public.claim WHERE stage = 'SUBMITTED_TO_AGENCY'");
    pendingClaimsCount = parseInt(pendingClaimsRes.rows[0].count);
  } finally {
    client.release();
  }

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
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mt-2">Dashboard Agency</h1>
          <p className="mt-1 text-base text-gray-500">Pantau performa agensi, perkembangan agen, dan klaim secara keseluruhan.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
          <Link href="/admin-agency/agents/new">
            <button className="bg-gray-900 hover:bg-black text-white text-[14px] font-semibold h-11 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Tambah Agen Baru
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="group bg-white rounded-3xl border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1 relative overflow-hidden"
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
            <div className="relative z-10 text-[40px] font-bold text-gray-900 tracking-tight tabular-nums mb-3 leading-none">{stat.value}</div>
            <p className="relative z-10 text-base font-medium text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Action required cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="group bg-white rounded-3xl border border-orange-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex justify-between items-start mb-8">
            <div className="p-4 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <div className="text-[40px] font-bold text-orange-600 tracking-tight tabular-nums mb-3 leading-none">{pendingTransfersCount}</div>
              <p className="text-base font-medium text-orange-700/80">Permintaan Transfer (Menunggu)</p>
            </div>
            <Link href="/admin-agency/transfers" className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 transition-colors">
              Tinjau Transfer
            </Link>
          </div>
        </div>

        <div className="group bg-white rounded-3xl border border-blue-100 p-8 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex justify-between items-start mb-8">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <div className="text-[40px] font-bold text-blue-600 tracking-tight tabular-nums mb-3 leading-none">{pendingClaimsCount}</div>
              <p className="text-base font-medium text-blue-700/80">Klaim Perlu Ditinjau</p>
            </div>
            <Link href="/admin-agency/claims" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors">
              Validasi Klaim
            </Link>
          </div>
        </div>
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-500 hover:shadow-md">
        <div className="px-8 py-8 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white gap-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 shadow-[0_0_12px_rgba(0,0,0,0.2)]"></div>
            Daftar Antrean Klaim
          </h2>
          <Link href="/admin-agency/claims">
            <button className="text-[15px] font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors group px-4 py-2 rounded-xl hover:bg-gray-50">
              Lihat Semua
              <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <ClaimsList role="admin_agency" claims={claims} />
        </div>
      </div>

    </div>
  );
}
