"use client";

import { useEffect, useState } from "react";
import { Bell, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; dot: string }> = {
  PENDING: { label: "Menunggu", dot: "bg-gray-400" },
  APPROVED: { label: "Disetujui", dot: "bg-gray-700" },
  REJECTED: { label: "Ditolak", dot: "bg-black" },
  COMPLETED: { label: "Selesai", dot: "bg-gray-300" },
};

export function Notifications({ role = 'agent' }: { role?: 'agent' | 'hospital' }) {
  const [count, setCount] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const endpoint = role === 'agent'
          ? "/api/agent/requests"
          : "/api/hospital/patients/request";

        const res = await fetch(endpoint);

        let data;
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          console.error("JSON Parse error:", e);
          return;
        }

        if (res.ok) {
          let relevantRequests = [];

          if (role === 'agent') {
            relevantRequests = data.requests.filter((r: any) => r.status === 'PENDING');
          } else {
            relevantRequests = data.requests.filter((r: any) =>
              r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'COMPLETED'
            );
          }

          setRequests(relevantRequests.slice(0, 5));
          setCount(relevantRequests.length);
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const viewAllHref = role === 'agent' ? "/agent/requests" : "/hospital/patients";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-xl border transition-all duration-200",
            open
              ? "bg-black text-white border-black"
              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-black"
          )}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white border-2 border-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
          <span className="sr-only">Notifikasi</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[340px] p-0 rounded-2xl border border-gray-100 shadow-xl bg-white overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {role === 'agent' ? 'Permintaan baru dari RS' : 'Update status permintaan'}
            </p>
          </div>
          {count > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-black text-white text-xs font-semibold px-2">
              {count}
            </span>
          )}
        </div>

        {/* List */}
        <div className="max-h-[320px] overflow-y-auto">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Tidak ada notifikasi</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {role === 'agent' ? 'Tidak ada permintaan baru.' : 'Tidak ada update terbaru.'}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {requests.map((req, idx) => {
                const cfg = statusConfig[req.status] || { label: req.status, dot: "bg-gray-300" };
                return (
                  <DropdownMenuItem key={req.request_id} asChild className="px-0 py-0 focus:bg-transparent">
                    <Link
                      href={viewAllHref}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer w-full"
                    >
                      <div className="mt-1 shrink-0">
                        <div className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {req.person_name}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                          {req.additional_data_request}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            req.status === 'PENDING' ? 'bg-gray-100 text-gray-600' :
                              req.status === 'APPROVED' ? 'bg-gray-800 text-white' :
                                req.status === 'REJECTED' ? 'bg-black text-white' :
                                  'bg-gray-100 text-gray-600'
                          )}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-50 p-2">
          <Link
            href={viewAllHref}
            className="flex items-center justify-center w-full py-2 text-xs font-medium text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-all duration-150"
            onClick={() => setOpen(false)}
          >
            Lihat Semua Notifikasi →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
