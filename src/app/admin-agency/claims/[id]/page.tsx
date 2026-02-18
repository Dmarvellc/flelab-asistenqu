import { getClaimById } from "@/services/claim-detail";
import { ClaimDetailView } from "@/components/admin/claim-detail-view";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminClaimDetailPage({ params }: { params: { id: string } }) {
    const claim = await getClaimById(params.id);

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
