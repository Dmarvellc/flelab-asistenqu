import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { AgentsDataTable } from "@/components/admin-agency/agents-data-table";
import { AgentInvitePanel } from "@/components/admin-agency/agent-invite-panel";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/dashboard/page-shell";

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
        <PageShell>
            <PageHeader 
                title="Manajemen Agen"
                description={
                    <>
                        Undang, setujui, dan pantau agen yang mewakili agensi Anda. Untuk operator internal
                        (Admin/Manager), buka{" "}
                        <Link href="/admin-agency/team" className="text-black underline decoration-dotted underline-offset-2 font-semibold hover:text-violet-700">
                            Staff Internal
                        </Link>.
                    </>
                }
            />

            {/* Invite + Join Requests + Pending Invitations (client) */}
            <div className="mt-4">
                <AgentInvitePanel />
            </div>

            {/* Agents table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-8">
                <AgentsDataTable agents={agents} />
            </div>
        </PageShell>
    );
}
