import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClaims } from "@/services/admin-agency";
import { ClaimsList } from "@/components/dashboard/claims-list";
import { Claim } from "@/lib/claims-data";
import { FileText } from "lucide-react";

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
                <h1 className="text-2xl font-bold text-red-600">Terjadi Kesalahan</h1>
                <p>Silakan login kembali sebagai admin agensi.</p>
            </div>
        );
    }

    const claims: Claim[] = await getAgencyClaims(agencyId);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl">
            {/* Header */}
            <div>
                <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-medium px-3 py-1 rounded-full mb-3 shadow-sm">
                    <FileText className="h-3 w-3" />
                    <span>Manajemen Klaim</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Validasi Klaim</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Daftar seluruh klaim yang diajukan oleh agen di bawah agensi Anda.
                </p>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transform transition-all duration-500 hover:shadow-md">
                <div className="px-6 py-5 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 shadow-[0_0_12px_rgba(0,0,0,0.2)]"></div>
                            Riwayat Klaim
                        </h2>
                        <p className="text-xs font-medium text-gray-500 mt-0.5 ml-5">Total {claims.length} klaim dalam sistem.</p>
                    </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                    <ClaimsList role="admin_agency" claims={claims} />
                </div>
            </div>
        </div>
    );
}
