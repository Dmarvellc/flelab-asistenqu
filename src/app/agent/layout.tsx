"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Briefcase, Users, FileText, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/agent/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/agent" className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-6 w-6" />
          <span>Agent Portal</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/agent" icon={LayoutDashboard} active>
          Dashboard
        </NavItem>
        <NavItem href="/agent/clients" icon={Users}>
          Clients
        </NavItem>
        <NavItem href="/agent/policies" icon={FileText}>
          Policies
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
