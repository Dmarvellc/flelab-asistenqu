"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Activity, Building2, Users, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/hospital/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/hospital" className="flex items-center gap-2 font-semibold">
          <Building2 className="h-6 w-6" />
          <span>Hospital Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/hospital" icon={LayoutDashboard} active>
          Dashboard
        </NavItem>
        <NavItem href="/hospital/patients" icon={Users}>
          Patients
        </NavItem>
        <NavItem href="/hospital/reports" icon={Activity}>
          Reports
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
