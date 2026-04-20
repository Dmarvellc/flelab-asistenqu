"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Generic notification bell — portal-agnostic.
 * Reads from /api/notifications which returns the current user's rows
 * from the `notification` table (no role parameter needed).
 */

interface NotifItem {
  id: string;
  event_type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const EVENT_DOT: Record<string, string> = {
  "client_request.created": "bg-amber-500",
  "client_request.approved": "bg-emerald-500",
  "client_request.rejected": "bg-rose-500",
  "client_request.message": "bg-blue-500",
  "claim.submitted": "bg-amber-500",
  "claim.info_requested": "bg-amber-500",
  "claim.approved": "bg-emerald-500",
  "claim.rejected": "bg-rose-500",
  "system.alert": "bg-gray-900",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}d`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  const d = Math.floor(h / 24);
  return `${d}h`;
}

// Backwards-compat: old layouts pass `role="hospital"|"agent"` — we accept
// and ignore it so we don't have to touch every layout at once.
export function Notifications(_props?: { role?: string }) {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { notifications: NotifItem[]; unread: number };
      setItems(j.notifications ?? []);
      setUnread(j.unread ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: "all" }),
    }).catch(() => {});
    await fetchFeed();
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    }).catch(() => {});
    await fetchFeed();
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) fetchFeed();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-xl border transition-all duration-200",
            open
              ? "bg-black text-white border-black"
              : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-black",
          )}
          aria-label="Notifikasi"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] p-0 rounded-2xl border border-gray-100 shadow-xl bg-white overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-900">Notifikasi</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-gray-500 hover:text-black flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Tandai semua
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="py-1">
              {items.map((n) => {
                const dot = EVENT_DOT[n.event_type] ?? "bg-gray-400";
                const isUnread = !n.read_at;
                const content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors duration-150 w-full",
                      isUnread ? "bg-blue-50/40 hover:bg-blue-50/80" : "hover:bg-gray-50",
                    )}
                  >
                    <div className="mt-1.5 shrink-0">
                      <div className={cn("h-2 w-2 rounded-full", dot)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                        {timeAgo(n.created_at)} lalu
                      </p>
                    </div>
                  </div>
                );
                return (
                  <DropdownMenuItem
                    key={n.id}
                    asChild
                    className="px-0 py-0 focus:bg-transparent cursor-pointer"
                    onSelect={() => {
                      void markOne(n.id);
                    }}
                  >
                    {n.link ? (
                      <Link href={n.link}>{content}</Link>
                    ) : (
                      <button type="button" className="w-full text-left">
                        {content}
                      </button>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
