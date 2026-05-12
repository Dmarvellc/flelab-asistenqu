"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  DashboardLayout,
  DashboardHeader,
  DashboardSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  NavItem,
} from "@/components/dashboard/dashboard-layout";
import {
  LayoutDashboard,
  LogOut,
  Users,
  Briefcase,
  BarChart2,
  Server,
  Building2,
  UserCheck,
  Box,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Notifications } from "@/components/dashboard/notifications";
import { useBusy } from "@/components/ui/busy-overlay-provider";

export function DeveloperLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { run } = useBusy();

  const handleLogout = useCallback(async () => {
    await run(async () => {
      await fetch("/api/auth/logout?from=developer", { method: "POST" }).catch(() => {});
      router.replace("/developer/login");
      router.refresh();
    }, "Keluar…");
  }, [router, run]);

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/developer">
          <Logo height={28} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Overview ── */}
        <div className="px-2 pb-1 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Ringkasan</p>
        </div>
        <NavItem
          href="/developer"
          icon={LayoutDashboard}
          active={pathname === "/developer"}
        >
          Dasbor
        </NavItem>
        <NavItem
          href="/developer/analytics"
          icon={BarChart2}
          active={pathname === "/developer/analytics"}
        >
          Analitik
        </NavItem>
        <NavItem
          href="/developer/system"
          icon={Server}
          active={pathname === "/developer/system"}
        >
          Kesehatan Sistem
        </NavItem>

        {/* ── Management ── */}
        <div className="px-2 pb-1 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Pengelolaan</p>
        </div>
        <NavItem
          href="/developer/claims"
          icon={FileText}
          active={pathname === "/developer/claims"}
        >
          Klaim
        </NavItem>
        <NavItem
          href="/developer/users"
          icon={Users}
          active={pathname === "/developer/users"}
        >
          Pengguna
        </NavItem>
        <NavItem
          href="/developer/agencies"
          icon={Briefcase}
          active={pathname === "/developer/agencies"}
        >
          Agensi
        </NavItem>
        <NavItem
          href="/developer/hospitals"
          icon={Building2}
          active={pathname === "/developer/hospitals"}
        >
          Rumah Sakit
        </NavItem>
        <NavItem
          href="/developer/clients"
          icon={UserCheck}
          active={pathname === "/developer/clients"}
        >
          Klien
        </NavItem>

        {/* ── Tools ── */}
        <div className="px-2 pb-1 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Alat</p>
        </div>
        <NavItem
          href="/developer/sandbox"
          icon={Box}
          active={pathname === "/developer/sandbox"}
        >
          Sandbox
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
  );

  return (
    <DashboardLayout
      sidebar={sidebar}
      header={
        <DashboardHeader mobileSidebar={sidebar} actions={<Notifications />}>
          <Link href="/developer">
            <Logo height={20} />
          </Link>
        </DashboardHeader>
      }
    >
      <div className="pb-10">{children}</div>
    </DashboardLayout>
  );
}
