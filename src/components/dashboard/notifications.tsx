"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function Notifications({ role = 'agent' }: { role?: 'agent' | 'hospital' }) {
  const [count, setCount] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Determine endpoint based on role
        const endpoint = role === 'agent' 
          ? "/api/agent/requests" 
          : "/api/hospital/patients/request";
          
        const res = await fetch(endpoint);
        const data = await res.json();
        
        if (res.ok) {
          let relevantRequests = [];
          
          if (role === 'agent') {
            // Agent sees PENDING requests
            relevantRequests = data.requests.filter((r: any) => r.status === 'PENDING');
          } else {
            // Hospital sees APPROVED or REJECTED requests (updates)
            // Ideally we should have an 'is_read' flag, but for now show recent non-pending ones
            relevantRequests = data.requests.filter((r: any) => 
              r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'COMPLETED'
            );
          }
          
          setRequests(relevantRequests.slice(0, 5)); // Show max 5
          setCount(relevantRequests.length);
        }
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    };
    
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [role]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative ml-auto">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {count}
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifikasi ({role === 'agent' ? 'Permintaan Baru' : 'Update Status'})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {requests.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {role === 'agent' ? 'Tidak ada permintaan baru.' : 'Tidak ada update terbaru.'}
          </div>
        ) : (
          requests.map((req) => (
            <DropdownMenuItem key={req.request_id} asChild>
              <Link href={role === 'agent' ? "/agent" : "/hospital/patients"} className="cursor-pointer flex flex-col items-start gap-1 p-3">
                <div className="font-medium">
                  {role === 'agent' ? 'Permintaan Data:' : 'Update Status:'} {req.person_name}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">{req.additional_data_request}</div>
                <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={
                        req.status === 'PENDING' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                        req.status === 'APPROVED' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                        req.status === 'REJECTED' ? 'text-red-600 border-red-200 bg-red-50' :
                        'text-green-600 border-green-200 bg-green-50'
                    }>
                        {req.status}
                    </Badge>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href={role === 'agent' ? "/agent" : "/hospital/patients"} className="w-full text-center cursor-pointer">Lihat Semua</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
