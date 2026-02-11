"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Users, FileText, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Normalize pathname to ensure robust comparison 
  const isPublicPage = pathname === "/agent/login" || pathname === "/agent/register";

  // Use useCallback because handleLogout is a dependency of useEffect
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
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

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/agent" className="flex items-center gap-2 font-bold text-lg tracking-wide text-white">
          <span>Portal Agen</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass active prop explicitly */}
        <NavItem href="/agent" icon={LayoutDashboard} active={pathname === "/agent"}>
          Dasbor
        </NavItem>
        <NavItem href="/agent/clients" icon={Users} active={pathname === "/agent/clients"}>
          Klien
        </NavItem>
        <NavItem href="/agent/policies" icon={FileText} active={pathname === "/agent/policies"}>
          Polis
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </SidebarFooter>
    </DashboardSidebar>
  )

  return (
    <DashboardLayout sidebar={sidebar} header={<DashboardHeader mobileSidebar={sidebar} />}>
      {children}
    </DashboardLayout>
  )
}
