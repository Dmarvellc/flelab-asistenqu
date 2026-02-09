"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Shield, Globe, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminAgencyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin-agency/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/admin-agency" className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6" />
          <span>Agency Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/admin-agency" icon={LayoutDashboard} active>
          Dashboard
        </NavItem>
        <NavItem href="/admin-agency/network" icon={Globe}>
          Network
        </NavItem>
        <NavItem href="/admin-agency/settings" icon={Settings}>
          Settings
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/api/auth/logout">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
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
