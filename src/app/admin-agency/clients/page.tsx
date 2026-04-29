import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClients, AgencyClient, getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { ClientsTable } from "@/components/admin/clients-table";

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

export default async function AdminClientsPage() {
    const agencyId = await getAgencyId();

    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
                <p>Please log in as an agency admin.</p>
            </div>
        );
    }

    const [clients, agents] = await Promise.all([
        getAgencyClients(agencyId),
        getAgencyAgents(agencyId),
    ]);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Manajemen Klien</h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        Kelola dan distribusikan kembali klien dan polis ke agen-agen di bawah agensi Anda.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">Direktori Klien</h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">Total {clients.length} klien didampingi oleh agen agensi ini.</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <ClientsTable clients={clients} agents={agents} />
                </div>
            </div>
        </div>
    );
}
