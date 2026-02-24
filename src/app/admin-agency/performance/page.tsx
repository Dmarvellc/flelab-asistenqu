import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyPerformance } from "@/services/admin-agency";
import AdminAgentPerformanceClient from "./performance-client";
import { Users } from "lucide-react";

export default async function AdminAgentPerformancePage() {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!userIdCookie) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Users className="h-12 w-12 text-gray-200" />
                <h1 className="text-xl font-bold text-gray-900">Akses Ditolak</h1>
                <p className="text-gray-500 text-sm">Sesi login Anda telah habis atau tidak valid.</p>
            </div>
        );
    }

    const client = await dbPool.connect();
    let agencyId = null;
    try {
        const res = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userIdCookie.value]);
        agencyId = res.rows[0]?.agency_id || null;
    } finally {
        client.release();
    }

    if (!agencyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Users className="h-12 w-12 text-gray-200" />
                <h1 className="text-xl font-bold text-gray-900">Agensi Tidak Ditemukan</h1>
                <p className="text-gray-500 text-sm">Akun ini belum terafiliasi dengan agensi manapun.</p>
            </div>
        );
    }

    const agents = await getAgencyPerformance(agencyId);

    return <AdminAgentPerformanceClient initialAgents={agents} />;
}
