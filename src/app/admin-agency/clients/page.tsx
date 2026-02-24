import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClients, AgencyClient, getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { ClientsTable } from "@/components/admin/clients-table";
import { Users } from "lucide-react";

async function getAgencyId(): Promise<string | null> {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!userIdCookie) return null;

    const client = await dbPool.connect();
    try {
        const res = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userIdCookie.value]);
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
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3 shadow-sm">
                    <Users className="h-3 w-3" />
                    <span>Daftar Klien Agensi</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manajemen Klien</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Kelola dan distribusikan kembali klien dan polis ke agen-agen di bawah agensi Anda.
                </p>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Direktori Klien</h2>
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
