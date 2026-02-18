import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClaimsList } from "@/components/dashboard/claims-list"
import { getAllClaims } from "@/services/claims"
import Link from "next/link"
import { dbPool } from "@/lib/db";

export default async function AdminAgencyDashboardPage() {
  const claims = await getAllClaims()

  const client = await dbPool.connect();
  let agentsCount = 0;
  let hospitalsCount = 0;
  let policiesCount = 0;
  let pendingTransfersCount = 0;
  let pendingClaimsCount = 0;

  try {
    const agentsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'agent'");
    agentsCount = parseInt(agentsRes.rows[0].count);

    const hospitalsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'hospital_admin'");
    hospitalsCount = parseInt(hospitalsRes.rows[0].count);

    const policiesRes = await client.query("SELECT COUNT(*) FROM public.client");
    policiesCount = parseInt(policiesRes.rows[0].count);

    const transfersRes = await client.query("SELECT COUNT(*) FROM public.agency_transfer_request WHERE status = 'PENDING'");
    pendingTransfersCount = parseInt(transfersRes.rows[0].count);

    const pendingClaimsRes = await client.query("SELECT COUNT(*) FROM public.claim WHERE stage = 'SUBMITTED_TO_AGENCY'");
    pendingClaimsCount = parseInt(pendingClaimsRes.rows[0].count);
  } finally {
    client.release();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Agency Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of agency performance and claims.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
            <CardDescription>Active agents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{agentsCount}</div>
              <Link href="/admin-agency/agents" className="text-sm font-medium text-blue-600 hover:underline">View List</Link>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partner Hospitals</CardTitle>
            <CardDescription>Verified providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hospitalsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Policies</CardTitle>
            <CardDescription>Policies issued</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{policiesCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400">Transfer Requests</CardTitle>
            <CardDescription>Pending approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">{pendingTransfersCount}</div>
              <Link href="/admin-agency/transfers" className="text-sm font-medium text-orange-600 hover:underline">View All</Link>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400">Claims Review</CardTitle>
            <CardDescription>Needs validation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{pendingClaimsCount}</div>
              <Link href="/admin-agency/claims" className="text-sm font-medium text-blue-600 hover:underline">Review</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <ClaimsList role="admin_agency" claims={claims} />
      </div>
    </div>
  );
}
