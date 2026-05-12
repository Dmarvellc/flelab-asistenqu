"use client";

import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Loading() {
  const pathname = usePathname();
  
  if (pathname?.match(/\/(login|register|verification)/)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50/50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return <DashboardSkeleton title="Developer Console" />;
}
