import { getAdminAgencyUserIdFromCookies } from "@/lib/auth-cookies";
import { getClaimById } from "@/services/claim-detail";
import { ClaimDetailView } from "@/components/admin/claim-detail-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { dbPool } from "@/lib/db";

export default async function AdminClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const claimId = resolvedParams.id;

    // Secure Data Isolation Check for Admin Agency
    const cookieStore = await cookies();
    const userId = await getAdminAgencyUserIdFromCookies();

    if (!userId) {
        notFound();
    }

    const client = await dbPool.connect();
    let isAuthorized = false;

    try {
        const authRes = await client.query(`
            SELECT c.claim_id 
            FROM public.claim c
            JOIN public.client cl ON c.client_id = cl.client_id
            JOIN public.app_user u ON cl.agent_id = u.user_id
            JOIN public.app_user admin ON admin.agency_id = u.agency_id
            WHERE c.claim_id = $1 AND admin.user_id = $2
        `, [claimId, userId]);

        isAuthorized = authRes.rows.length > 0;
    } finally {
        client.release();
    }

    if (!isAuthorized) {
        // Prevent IDOR: admin is trying to view a claim not belonging to their agency
        notFound();
    }

    const claim = await getClaimById(claimId);

    if (!claim) {
        notFound();
    }

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <Button variant="outline" size="icon" asChild className="rounded-xl shrink-0">
                    <Link href="/admin-agency/claims">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Detail Klaim</h1>
                    <p className="mt-0.5 text-sm text-gray-500">Informasi lengkap pengajuan klaim asuransi.</p>
                </div>
            </div>

            <ClaimDetailView claim={claim} />
        </div>
    );
}
