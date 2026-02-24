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
    const adminIdCookie = cookieStore.get("session_admin_agency_user_id");

    if (!adminIdCookie) {
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
        `, [claimId, adminIdCookie.value]);

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
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin-agency">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <span className="text-lg font-medium text-muted-foreground">Back to Dashboard</span>
            </div>

            <ClaimDetailView claim={claim} />
        </div>
    );
}
