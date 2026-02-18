import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClaims } from "@/services/admin-agency";
import { ClaimsList } from "@/components/dashboard/claims-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Claim } from "@/lib/claims-data";

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

export default async function AgencyClaimsPage() {
    const agencyId = await getAgencyId();

    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Agency Not Found</h1>
                <p>Please ensure you are logged in correctly.</p>
            </div>
        );
    }

    const claims: Claim[] = await getAgencyClaims(agencyId);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Claims Management</h2>
                <p className="text-muted-foreground">List of all claims submitted by agents under your agency.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Claims Overview</CardTitle>
                    <CardDescription>
                        Total Claims: <span className="font-bold text-blue-600">{claims.length}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ClaimsList role="admin_agency" claims={claims} />
                </CardContent>
            </Card>
        </div>
    );
}
