import { getSession } from "@/lib/auth";
import { ClaimsList } from "@/components/dashboard/claims-list"
import { redirect } from "next/navigation"
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims"
import { CalendarCheck, FileText, Activity } from "lucide-react";
import Link from "next/link";

export default async function HospitalDashboardPage() {
  const session = await getSession({ portal: "hospital" });

  if (!session) {
    redirect("/hospital/login")
  }

  const userId = session.userId;

  const hospitalId = await getHospitalIdByUserId(userId)
  const claims = await getHospitalClaims(hospitalId)

  const activeClaims = claims.filter(c =>
    ['SUBMITTED', 'INFO_REQUESTED', 'INFO_SUBMITTED'].includes(c.status)
  )
  const totalClaims = claims.length;
  const approvedClaims = claims.filter(c => c.status === 'APPROVED').length;

  const stats = [
    {
      label: "Klaim Aktif",
      value: activeClaims.length,
      description: "Perlu ditindaklanjuti",
      icon: FileText,
      href: "/hospital/claims",
      color: "bg-gray-900 text-white",
    },
    {
      label: "Total Klaim",
      value: totalClaims,
      description: "Sepanjang waktu",
      icon: Activity,
      href: "/hospital/claims",
      color: "bg-gray-100 text-gray-700",
    },
    {
      label: "Klaim Disetujui",
      value: approvedClaims,
      description: "Selesai diproses",
      icon: CalendarCheck,
      href: "/hospital/claims",
      color: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Dasbor Rumah Sakit</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Pantau status klaim asuransi dan jadwal pasien Anda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/hospital/appointments">
            <button className="bg-gray-900 hover:bg-black text-white text-sm font-semibold h-10 px-4 rounded-xl transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2">
              <CalendarCheck className="h-4 w-4" />
              Jadwal
            </button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className={`flex items-center gap-4 p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all ${stat.color === "bg-gray-900 text-white" ? "bg-gray-900" : "bg-white"}`}>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.color === "bg-gray-900 text-white" ? "bg-white/10" : stat.color}`}>
                <stat.icon className={`h-6 w-6 ${stat.color === "bg-gray-900 text-white" ? "text-white" : ""}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stat.color === "bg-gray-900 text-white" ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                <p className={`text-xs font-medium mt-0.5 ${stat.color === "bg-gray-900 text-white" ? "text-white/70" : "text-gray-500"}`}>{stat.label}</p>
                <p className={`text-[10px] ${stat.color === "bg-gray-900 text-white" ? "text-white/50" : "text-gray-400"}`}>{stat.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30">
          <h2 className="text-base font-bold text-gray-900">Klaim Aktif</h2>
          <p className="text-xs font-medium text-gray-500 mt-0.5">
            {activeClaims.length} klaim sedang dalam proses
          </p>
        </div>
        <div className="p-0">
          <ClaimsList role="hospital" claims={activeClaims} />
        </div>
      </div>
    </div>
  );
}
