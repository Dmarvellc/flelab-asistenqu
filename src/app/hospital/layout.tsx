"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Activity, Users, LogOut, FileText, CalendarCheck, Stethoscope, Building2, BarChart2, ClipboardList } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Notifications } from "@/components/dashboard/notifications";

const LOGO_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_logotext.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX2xvZ290ZXh0LnBuZyIsImlhdCI6MTc3MTkwMjgxNywiZXhwIjozMzI3NjM2NjgxN30.BDtpL6pQ6FhAGQF3V05PMC3gHkJ44R2O4vm3yfY2iyQ";

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/hospital/login";

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout?from=hospital", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    router.replace("/hospital/login");
  }, [router]);

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
        {/* ── Ringkasan ── */}
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-2 mb-1">Ringkasan</p>
        <NavItem href="/hospital" icon={LayoutDashboard} active={pathname === "/hospital"}>
          Dasbor
        </NavItem>
        <NavItem href="/hospital/reports" icon={BarChart2} active={pathname.startsWith("/hospital/reports")}>
          Laporan
        </NavItem>

        {/* ── Pasien & Layanan ── */}
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-4 mb-1">Layanan</p>
        <NavItem href="/hospital/appointments" icon={CalendarCheck} active={pathname.startsWith("/hospital/appointments")}>
          Jadwal
        </NavItem>
        <NavItem href="/hospital/patients" icon={Users} active={pathname.startsWith("/hospital/patients")}>
          Pasien
        </NavItem>
        <NavItem href="/hospital/claims" icon={FileText} active={pathname.startsWith("/hospital/claims")}>
          Klaim
        </NavItem>

        {/* ── Jaringan ── */}
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-4 mb-1">Jaringan</p>
        <NavItem href="/hospital/network" icon={Building2} active={pathname.startsWith("/hospital/network")}>
          Marketplace
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <button
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 ease-out group"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-500 group-hover:text-red-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Keluar</span>
        </button>
      </SidebarFooter>
    </DashboardSidebar>
  )

  return (
    <DashboardLayout sidebar={sidebar} header={
      <DashboardHeader mobileSidebar={sidebar} actions={<Notifications role="hospital" />}>
        <Link href="/hospital">
          <Image
            src={LOGO_URL}
            alt="AsistenQu Hospital"
            width={120}
            height={24}
            className="h-5 w-auto object-contain"
          />
        </Link>
      </DashboardHeader>
    }>
      {children}
    </DashboardLayout>
  )
}
