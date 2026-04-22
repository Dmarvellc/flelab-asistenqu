import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";
import { getAgencyClaims } from "@/services/admin-agency";
import { ClaimsDataTable } from "@/components/admin-agency/claims-data-table";
import { Claim } from "@/lib/claims-data";

async function getAgencyId(): Promise<string | null> {
    const cookieStore = await cookies();
    const userId = await getAdminAgencyUserIdFromCookies();
    if (!userId) return null;
    const client = await dbPool.connect();
    try {
        const res = await client.query("SELECT agency_id FROM app_user WHERE user_id = $1", [userId]);
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
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-gray-900">Validasi Klaim</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Daftar seluruh klaim yang diajukan oleh agen di bawah agensi Anda.
                </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <ClaimsDataTable claims={claims} role="admin_agency" showViewAll={false} />
            </div>
        </div>
    );
}
