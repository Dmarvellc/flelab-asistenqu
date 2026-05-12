import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgencyPerformance } from "@/services/admin-agency";
import AdminAgentPerformanceClient from "./performance-client";
import { Users } from "lucide-react";

export default async function AdminAgentPerformancePage() {
    const session = await getSession({ portal: "admin_agency" });
    if (!session) redirect("/admin-agency/login");

    const agencyId = session.agencyId;
    if (!agencyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Users className="h-12 w-12 text-gray-200" />
                <h1 className="text-xl font-bold text-black">Agensi Tidak Ditemukan</h1>
                <p className="text-gray-500 text-sm">Akun ini belum terafiliasi dengan agensi manapun.</p>
            </div>
        );
    }

    const agents = await getAgencyPerformance(agencyId);

    return <AdminAgentPerformanceClient initialAgents={agents} />;
}
