import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HospitalDashboardPage() {
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
            <div className="text-3xl font-bold">0</div>
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
    </div>
  );
}
