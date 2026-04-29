import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { AgentsDataTable } from "@/components/admin-agency/agents-data-table";
import { AgentInvitePanel } from "@/components/admin-agency/agent-invite-panel";
import Link from "next/link";

async function getAgencyId(): Promise<string | null> {
    const cookieStore = await cookies();
    const userId = await getAdminAgencyUserIdFromCookies();
    if (!userId) return null;
    const client = await dbPool.connect();
    try {
        const res = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userId]);
        return res.rows[0]?.agency_id || null;
    } finally {
        client.release();
    }
}

export default async function AgencyAgentsPage() {
    const agencyId = await getAgencyId();

    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Agency Not Found</h1>
                <p>Please ensure you are logged in correctly.</p>
            </div>
        );
    }

    const agents: AgencyAgent[] = await getAgencyAgents(agencyId);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                        Manajemen Agen
                    </h1>
                    <p className="mt-1.5 text-sm text-gray-500 max-w-xl">
                        Undang, setujui, dan pantau agen yang mewakili agensi Anda. Untuk operator internal
                        (Admin/Manager), buka{" "}
                        <Link href="/admin-agency/team" className="text-gray-900 underline decoration-dotted underline-offset-2 font-semibold hover:text-violet-700">
                            Staff Internal
                        </Link>.
                    </p>
                </div>
            </div>

            {/* Invite + Join Requests + Pending Invitations (client) */}
            <AgentInvitePanel />

            {/* Agents table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <AgentsDataTable agents={agents} />
            </div>
        </div>
    );
}
