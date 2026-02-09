import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AgentDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agent Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to your agent portal. Manage your clients and policies.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Clients</CardTitle>
            <CardDescription>Total active clients under management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Policies</CardTitle>
            <CardDescription>Policies awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commission</CardTitle>
            <CardDescription>Current month earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.00</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
