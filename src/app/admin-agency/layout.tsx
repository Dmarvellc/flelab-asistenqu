"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Shield, Globe, Settings, LogOut, Users, FileText, GitPullRequest } from "lucide-react"
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
        <NavItem href="/admin-agency" icon={LayoutDashboard} active={pathname === '/admin-agency'}>
          Dashboard
        </NavItem>
        <NavItem href="/admin-agency/agents" icon={Users} active={pathname.startsWith('/admin-agency/agents')}>
          Agents
        </NavItem>
        <NavItem href="/admin-agency/clients" icon={Users} active={pathname.startsWith('/admin-agency/clients')}>
          Clients
        </NavItem>
        <NavItem href="/admin-agency/claims" icon={FileText} active={pathname.startsWith('/admin-agency/claims')}>
          Claims
        </NavItem>
        <NavItem href="/admin-agency/transfers" icon={GitPullRequest} active={pathname.startsWith('/admin-agency/transfers')}>
          Transfer Requests
        </NavItem>
        <NavItem href="/admin-agency/settings" icon={Settings} active={pathname === '/admin-agency/settings'}>
          Settings
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/api/auth/logout?from=admin-agency">
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
