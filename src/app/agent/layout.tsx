"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { EmergencyButton } from "@/components/claims/emergency-button"
import { LayoutDashboard, Users, FileText, LogOut, Loader2, Settings, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils";
import { Notifications } from "@/components/dashboard/notifications";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Normalize pathname to ensure robust comparison 
  const isPublicPage = pathname === "/agent/login" || pathname === "/agent/register";

  // Use useCallback because handleLogout is a dependency of useEffect
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout?from=agent", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    localStorage.removeItem("user");
    setIsAuthorized(false);
    router.push("/agent/login");
  }, [router]);

  useEffect(() => {
    // 1. If public page, always allow access immediately
    if (isPublicPage) {
      setIsAuthorized(true);
      // We set isChecking to false to unblock UI
      setIsChecking(false);
      return;
    }

    // 2. If protected page, check local storage
    const user = localStorage.getItem("user");
    if (!user) {
      setIsAuthorized(false);
      setIsChecking(false);
      // Wait, we should redirect!
      // But if we just redirect, we might cause a redirect loop if the browser has a valid cookie
      // So we must clear the cookie first by calling logout
      handleLogout();
    } else {
      setIsAuthorized(true);
      setIsChecking(false);
    }
  }, [pathname, isPublicPage, handleLogout]);

  // Only show loader if we are checking auth on a PROTECTED page.
  if (isChecking && !isPublicPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Extra safety: if not checking, but not authorized and NOT public (waiting for flush), show loader
  if (!isChecking && !isAuthorized && !isPublicPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // If public page, just render children (auth not required)
  if (isPublicPage) {
    return <>{children}</>;
  }

  // If verification page, render without sidebar/layout (but auth was checked)
  // This allows the verification page to have its own full screen layout
  if (pathname === "/agent/verification") {
    return <>{children}</>;
  }

  const renderSidebar = (collapsed: boolean) => (
    <DashboardSidebar>
      <SidebarHeader className="flex items-center justify-between">
        {!collapsed && (
          <Link href="/agent" className="flex items-center gap-2 font-bold text-lg tracking-wide text-white animate-in fade-in duration-300">
            <span>Portal Agen</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-zinc-400 hover:text-white hover:bg-zinc-800", collapsed && "mx-auto")}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass active prop explicitly */}
        <NavItem href="/agent" icon={LayoutDashboard} active={pathname === "/agent"} isCollapsed={collapsed}>
          Dasbor
        </NavItem>
        <NavItem href="/agent/clients" icon={Users} active={pathname === "/agent/clients"} isCollapsed={collapsed}>
          Klien
        </NavItem>
        <NavItem href="/agent/claims" icon={FileText} active={pathname === "/agent/claims"} isCollapsed={collapsed}>
          Klaim
        </NavItem>
        <NavItem href="/agent/requests" icon={ClipboardList} active={pathname === "/agent/requests" || pathname.startsWith("/agent/requests/")} isCollapsed={collapsed}>
          Permintaan
        </NavItem>
        <NavItem href="/agent/settings" icon={Settings} active={pathname === "/agent/settings"} isCollapsed={collapsed}>
          Pengaturan
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900",
            collapsed && "justify-center px-2"
          )}
          onClick={handleLogout}
          title={collapsed ? "Keluar" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Keluar</span>}
        </Button>
      </SidebarFooter>
    </DashboardSidebar>
  );

  return (
    <DashboardLayout
      sidebar={renderSidebar(isCollapsed)}
      header={
        <DashboardHeader mobileSidebar={renderSidebar(false)}>
          <Notifications role="agent" />
        </DashboardHeader>
      }
      isCollapsed={isCollapsed}
    >
      {children}
      <EmergencyButton unitLabel="Tim Agen / Case Manager" />
    </DashboardLayout>
  )
}
