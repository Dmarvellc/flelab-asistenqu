import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgencyClaims } from "@/services/admin-agency";
import { ClaimsDataTable } from "@/components/admin-agency/claims-data-table";
import { Claim } from "@/lib/claims-data";
import { PageShell, PageHeader } from "@/components/dashboard/page-shell";

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
        <PageShell>
            <PageHeader 
                title="Validasi Klaim" 
                description="Daftar seluruh klaim yang diajukan oleh agen di bawah agensi Anda."
            />
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-4">
                <ClaimsDataTable claims={claims} role="admin_agency" showViewAll={false} />
            </div>
        </PageShell>
    );
}
