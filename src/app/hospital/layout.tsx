"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Activity, Users, LogOut, FileText, CalendarCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Notifications } from "@/components/dashboard/notifications";

const LOGO_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_logotext.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX2xvZ290ZXh0LnBuZyIsImlhdCI6MTc3MTkwMjgxNywiZXhwIjozMzI3NjM2NjgxN30.BDtpL6pQ6FhAGQF3V05PMC3gHkJ44R2O4vm3yfY2iyQ";

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/hospital/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/hospital">
          <Image
            src={LOGO_URL}
            alt="AsistenQu Hospital"
            width={160}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/hospital" icon={LayoutDashboard} active={pathname === "/hospital"}>
          Dasbor
        </NavItem>
        <NavItem href="/hospital/appointments" icon={CalendarCheck} active={pathname.startsWith("/hospital/appointments")}>
          Jadwal
        </NavItem>
        <NavItem href="/hospital/patients" icon={Users} active={pathname.startsWith("/hospital/patients")}>
          Pasien
        </NavItem>
        <NavItem href="/hospital/claims" icon={FileText} active={pathname.startsWith("/hospital/claims")}>
          Klaim
        </NavItem>
        <NavItem href="/hospital/reports" icon={Activity} active={pathname.startsWith("/hospital/reports")}>
          Laporan
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Link
          href="/api/auth/logout?from=hospital"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 ease-out group"
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-500 group-hover:text-red-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Keluar</span>
        </Link>
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
