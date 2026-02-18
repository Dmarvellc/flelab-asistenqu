import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClients, AgencyClient, getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { ClientsTable } from "@/components/admin/clients-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clients Management</h2>
                <p className="text-muted-foreground">Reassign or manage clients linked to your agency.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Clients ({clients.length})</CardTitle>
                    <CardDescription>Policies assigned to your agency.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClientsTable clients={clients} agents={agents} />
                </CardContent>
            </Card>
        </div>
    );
}
