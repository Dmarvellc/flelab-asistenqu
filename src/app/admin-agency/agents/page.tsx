import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { AgentsDataTable } from "@/components/admin-agency/agents-data-table";
import { AgentInvitePanel } from "@/components/admin-agency/agent-invite-panel";
import Link from "next/link";

export default async function AgencyAgentsPage() {
    const session = await getSession({ portal: "admin_agency" });
    if (!session) redirect("/admin-agency/login");

    const agencyId = session.agencyId;
    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Agensi Tidak Ditemukan</h1>
                <p>Akun ini belum terafiliasi dengan agensi manapun.</p>
            </div>
        );
    }

    const agents: AgencyAgent[] = await getAgencyAgents(agencyId);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-200">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
                        Manajemen Agen
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
                        Undang, setujui, dan pantau agen yang mewakili agensi Anda. Untuk operator internal
                        (Admin/Manager), buka{" "}
                        <Link href="/admin-agency/team" className="text-black underline decoration-dotted underline-offset-2 font-semibold hover:text-violet-700">
                            Staff Internal
                        </Link>.
                    </p>
                </div>
            </div>

            {/* Invite + Join Requests + Pending Invitations (client) */}
            <AgentInvitePanel />

            {/* Agents table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <AgentsDataTable agents={agents} />
            </div>
        </div>
    );
}
