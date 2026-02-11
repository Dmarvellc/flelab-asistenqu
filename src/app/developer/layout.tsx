"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, LogOut, Loader2, Users, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Define public pages
  const isPublicPage = pathname === "/developer/login";

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    localStorage.removeItem("user");
    setIsAuthorized(false);
    router.push("/developer/login");
  }, [router]);

  useEffect(() => {
    // 1. If public page, always allow access immediately
    if (isPublicPage) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    // 2. If protected page, check local storage
    const user = localStorage.getItem("user");
    if (!user) {
      setIsAuthorized(false);
      setIsChecking(false);
      // Force logout to clear cookies and redirect
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
        <Link href="/developer" className="flex items-center gap-2 font-bold text-lg tracking-wide text-white">
          <span>Developer Console</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {/* Pass active prop explicitly */}
        <NavItem href="/developer" icon={LayoutDashboard} active={pathname === "/developer"}>
          Dashboard
        </NavItem>
        <NavItem href="/developer/users" icon={Users} active={pathname === "/developer/users"}>
          User List
        </NavItem>
        <NavItem href="/developer/pending" icon={UserCheck} active={pathname === "/developer/pending"}>
          Pending Approvals
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
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
