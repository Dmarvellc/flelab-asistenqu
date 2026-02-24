"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function ApproveAgentButton({ agentId, status }: { agentId: string, status: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    if (status !== 'PENDING') {
        return null;
    }

    const handleApprove = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin-agency/agents/${agentId}/approve`, {
                method: "POST",
            });

            if (res.ok) {
                toast({ title: "Berhasil", description: "Agen telah disetujui." });
                router.refresh();
            } else {
                toast({ title: "Gagal", description: "Gagal menyetujui agen.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Terjadi kesalahan sistem.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="default"
            size="sm"
            className="h-8 shadow-sm bg-gray-900 text-white hover:bg-black transition-colors mr-2 px-3"
            onClick={handleApprove}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
            Setujui
        </Button>
    );
}
