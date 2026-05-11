import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgencyClaims } from "@/services/admin-agency";
import { ClaimsDataTable } from "@/components/admin-agency/claims-data-table";
import { Claim } from "@/lib/claims-data";

export default async function AgencyClaimsPage() {
    const session = await getSession({ portal: "admin_agency" });
    if (!session) redirect("/admin-agency/login");

    const agencyId = session.agencyId;
    if (!agencyId) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-red-600">Terjadi Kesalahan</h1>
                <p>Akun ini belum terafiliasi dengan agensi manapun.</p>
            </div>
        );
    }

    const claims: Claim[] = await getAgencyClaims(agencyId);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Validasi Klaim</h1>
                    <p className="mt-1.5 text-sm text-gray-500">
                        Daftar seluruh klaim yang diajukan oleh agen di bawah agensi Anda.
                    </p>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <ClaimsDataTable claims={claims} role="admin_agency" showViewAll={false} />
            </div>
        </div>
    );
}
