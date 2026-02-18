import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Phone, CalendarCheck, FileText, Shield } from "lucide-react";

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

export default async function AgencyAgentsPage() {
    const agencyId = await getAgencyId();

    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Agency Not Found</h1>
                <p>Please ensure you are logged in correctly.</p>
            </div>
        );
    }

    const agents: AgencyAgent[] = await getAgencyAgents(agencyId);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Agents Management</h2>
                <p className="text-muted-foreground">List of all active agents under your agency.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Agents List</CardTitle>
                    <CardDescription>View performance and status of your agents.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined At</TableHead>
                                <TableHead>Policies</TableHead>
                                <TableHead>Claims</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No agents found in this agency.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agents.map((agent) => (
                                    <TableRow key={agent.user_id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-medium">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                {agent.full_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-sm">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Mail className="h-3 w-3" /> {agent.email}
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Phone className="h-3 w-3" /> {agent.phone_number || "-"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                {agent.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <CalendarCheck className="h-3 w-3 text-muted-foreground" />
                                                {agent.joined_at ? new Date(agent.joined_at).toLocaleDateString() : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-medium">
                                                <Shield className="h-3 w-3 text-blue-500" />
                                                {agent.total_policies}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-medium">
                                                <FileText className="h-3 w-3 text-orange-500" />
                                                {agent.total_claims}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">View Detail</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
