import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminAgencyDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agency Administration</h2>
        <p className="text-muted-foreground">
          Oversee agency operations and insurance networks.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Agents</CardTitle>
            <CardDescription>Registered agents in network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Partner Hospitals</CardTitle>
            <CardDescription>Active hospital partnerships</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Policies</CardTitle>
            <CardDescription>Active insurance policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
