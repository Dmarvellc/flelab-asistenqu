import { Button } from "@/components/ui/button"
import { Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { ClaimsList } from "@/components/dashboard/claims-list"
import { cookies } from "next/headers"
import { getAgentClaims, getAgentIdByUserId } from "@/services/claims"
import { getAgentMetrics } from "@/services/agent-metrics"

export default async function AgentDashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("app_user_id")?.value || ""

  const [agentId, metrics] = await Promise.all([
    getAgentIdByUserId(userId),
    getAgentMetrics(userId)
  ]);

  const claims = agentId ? await getAgentClaims(agentId) : [];

  const stats = [
    { label: "Klien Aktif", value: metrics.activeClients },
    { label: "Polis Pending", value: metrics.pendingContracts },
    { label: "Total Klaim", value: metrics.totalClaims },
    { label: "Poin", value: metrics.points },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Dasbor</h1>
        <div className="flex items-center gap-2">
          <Link href="/agent/claims/new">
            <Button variant="outline" size="sm" className="border-gray-200 text-gray-600 text-xs h-8 px-3">
              Klaim Baru
            </Button>
          </Link>
          <Link href="/agent/clients/new">
            <Button size="sm" className="bg-black hover:bg-gray-900 text-white text-xs h-8 px-3">
              + Tambah Klien
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — no icons, value + secondary label */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</div>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Claims list */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Klaim Terkini</span>
          <Link href="/agent/claims">
            <button className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
              Semua <ArrowRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
        <div className="p-4">
          <ClaimsList role="agent" claims={claims} />
        </div>
      </div>

    </div>
  );
}
