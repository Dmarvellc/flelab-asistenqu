import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyAgents, AgencyAgent } from "@/services/admin-agency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Mail, Phone, CalendarCheck, FileText, Shield } from "lucide-react";
import { ApproveAgentButton } from "@/components/admin/approve-agent-button";

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
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3 shadow-sm">
                    <User className="h-3 w-3" />
                    <span>Daftar Agen Aktif</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manajemen Agen</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Pantau informasi kontak, histori, dan status agen yang terdaftar di perusahaan Anda.
                </p>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Direktori Agen</h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">Total {agents.length} agen terdaftar dalam sistem.</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-gray-100">
                                <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Nama Lengkap</TableHead>
                                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Kontak</TableHead>
                                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Status</TableHead>
                                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Bergabung</TableHead>
                                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider h-11">Polis Aktif</TableHead>
                                <TableHead className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider h-11 text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                                            <User className="h-10 w-10 text-gray-200" />
                                            <p className="text-sm">Belum ada agen yang terdaftar.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                agents.map((agent) => (
                                    <TableRow key={agent.user_id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                </div>
                                                <div className="font-semibold text-sm text-gray-900 truncate max-w-[180px]">
                                                    {agent.full_name}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1.5 text-xs">
                                                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                    <Mail className="h-3 w-3 text-gray-400" /> {agent.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                    <Phone className="h-3 w-3 text-gray-400" /> {agent.phone_number || "-"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${agent.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                agent.status === 'PENDING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                                    'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {agent.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                                                <CalendarCheck className="h-3.5 w-3.5 text-gray-400" />
                                                {agent.joined_at ? new Date(agent.joined_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-xs font-semibold text-gray-900">
                                                    <Shield className="h-3.5 w-3.5 text-gray-400" />
                                                    {agent.total_policies} polis
                                                </div>
                                                <div className="flex items-center gap-1 text-xs font-semibold text-gray-900">
                                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                    {agent.total_claims} klaim
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                <ApproveAgentButton agentId={agent.user_id} status={agent.status} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
