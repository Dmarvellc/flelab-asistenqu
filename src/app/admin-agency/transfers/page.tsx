import { TransferRequestsTable } from "@/components/admin/transfer-requests-table";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PendingTransfersPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin-agency">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Pending Agency Transfers</h1>
            </div>

            <p className="text-muted-foreground">
                Review and approve agent transfer requests between agencies.
            </p>

            <div className="mt-4">
                <TransferRequestsTable />
            </div>
        </div>
    );
}
