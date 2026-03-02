"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { EmergencyButton } from "@/components/claims/emergency-button"
import { LayoutDashboard, Activity, Users, LogOut, FileText, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

import { Notifications } from "@/components/dashboard/notifications";

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
          <span>Admin Rumah Sakit</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/hospital" icon={LayoutDashboard} active={pathname === '/hospital'}>
          Dasbor
        </NavItem>
        <NavItem href="/hospital/appointments" icon={CalendarCheck} active={pathname.startsWith('/hospital/appointments')}>
          Jadwal
        </NavItem>
        <NavItem href="/hospital/patients" icon={Users} active={pathname.startsWith('/hospital/patients')}>
          Pasien
        </NavItem>
        <NavItem href="/hospital/claims" icon={FileText} active={pathname.startsWith('/hospital/claims')}>
          Klaim
        </NavItem>
        <NavItem href="/hospital/reports" icon={Activity} active={pathname.startsWith('/hospital/reports')}>
          Laporan
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/api/auth/logout?from=hospital">
            <LogOut className="h-4 w-4" />
            Keluar
          </Link>
        </Button>
      </SidebarFooter>
    </DashboardSidebar>
  )

  return (
    <DashboardLayout sidebar={sidebar} header={
      <DashboardHeader mobileSidebar={sidebar}>
        <Notifications role="hospital" />
      </DashboardHeader>
    }>
      {children}
    </DashboardLayout>
  )
}
