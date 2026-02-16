import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClaimsList } from "@/components/dashboard/claims-list"
import { getAllClaims } from "@/services/claims"


import { dbPool } from "@/lib/db";

export default async function AdminAgencyDashboardPage() {
  const claims = await getAllClaims()
  
  const client = await dbPool.connect();
  let agentsCount = 0;
  let hospitalsCount = 0;
  let policiesCount = 0;
  
  try {
    const agentsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'agent'");
    agentsCount = parseInt(agentsRes.rows[0].count);
    
    const hospitalsRes = await client.query("SELECT COUNT(*) FROM public.app_user WHERE role = 'hospital_admin'");
    hospitalsCount = parseInt(hospitalsRes.rows[0].count);
    
    const policiesRes = await client.query("SELECT COUNT(*) FROM public.client");
    policiesCount = parseInt(policiesRes.rows[0].count);
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
            <CardDescription>Active agents across regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agentsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partner Hospitals</CardTitle>
            <CardDescription>Verified healthcare providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{hospitalsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Policies</CardTitle>
            <CardDescription>Total insurance policies issued</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{policiesCount}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6">
        <ClaimsList role="admin_agency" claims={claims} />
      </div>
    </div>
  );
}
