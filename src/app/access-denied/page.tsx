import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const allowedRoles = [
  "super_admin",
  "admin_agency",
  "insurance_admin",
  "hospital_admin",
  "agent_manager",
  "agent",
  "developer",
];

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-muted/40 px-6 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your role does not have access to that dashboard. Please sign in
              with the correct account.
            </p>
            <div className="flex flex-wrap gap-2">
              {allowedRoles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/login/developer">Developer Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login/admin-agency">Agency Admin Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login/insurance">Insurance Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login/hospital">Hospital Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login/agent-manager">Agent Manager Login</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/login/agent">Agent Login</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
