import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ClaimsList } from "@/components/dashboard/claims-list"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims"

export default async function HospitalDashboardPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("app_user_id")?.value

  // Cookie missing → not logged in, redirect to login
  if (!userId || userId.trim() === "") {
    redirect("/hospital/login")
  }

  const hospitalId = await getHospitalIdByUserId(userId)
  const claims = await getHospitalClaims(hospitalId)


  // Filter for "On Progress" claims roughly
  const activeClaims = claims.filter(c =>
    ['SUBMITTED', 'INFO_REQUESTED', 'INFO_SUBMITTED'].includes(c.status)
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hospital Dashboard</h2>
        <p className="text-muted-foreground">
          Manage patient admissions and insurance claims.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Admitted Patients</CardTitle>
            <CardDescription>Currently admitted under insurance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Claims</CardTitle>
            <CardDescription>Claims awaiting processing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeClaims.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Daily Check-ins</CardTitle>
            <CardDescription>Today's patient volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <ClaimsList role="hospital" claims={activeClaims} />
      </div>
    </div>
  );
}
