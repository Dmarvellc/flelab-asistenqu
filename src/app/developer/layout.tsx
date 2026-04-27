"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
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
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Notifications } from "@/components/dashboard/notifications";

const LOGO_URL =
  "https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_logotext.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX2xvZ290ZXh0LnBuZyIsImlhdCI6MTc3MTkwMjgxNywiZXhwIjozMzI3NjM2NjgxN30.BDtpL6pQ6FhAGQF3V05PMC3gHkJ44R2O4vm3yfY2iyQ";

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = pathname === "/developer/login";

  useEffect(() => {
    if (isPublicPage) return;

    fetch("/api/developer/stats", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          // Stale session (wrong role) → clear it first to avoid redirect loop
          await fetch("/api/auth/logout?from=developer", { method: "POST" }).catch(() => { });
          router.replace("/developer/login");
        }
      })
      .catch(() => { });
  }, [pathname, isPublicPage, router]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout?from=developer", { method: "POST" }).catch(
      () => { }
    );
    router.replace("/developer/login");
  }, [router]);

  if (isPublicPage) return <>{children}</>;

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/developer">
          <Image
            src={LOGO_URL}
            alt="AsistenQu Developer"
            width={160}
            height={32}
            className="h-8 w-auto object-contain"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Overview ── */}
        <div className="px-2 pb-1 pt-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Overview</p>
        </div>
        <NavItem
          href="/developer"
          icon={LayoutDashboard}
          active={pathname === "/developer"}
        >
          Dashboard
        </NavItem>
        <NavItem
          href="/developer/analytics"
          icon={BarChart2}
          active={pathname === "/developer/analytics"}
        >
          Analytics
        </NavItem>
        <NavItem
          href="/developer/system"
          icon={Server}
          active={pathname === "/developer/system"}
        >
          System Health
        </NavItem>

        {/* ── Management ── */}
        <div className="px-2 pb-1 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Management</p>
        </div>
        <NavItem
          href="/developer/users"
          icon={Users}
          active={pathname === "/developer/users"}
        >
          Users
        </NavItem>
        <NavItem
          href="/developer/agencies"
          icon={Briefcase}
          active={pathname === "/developer/agencies"}
        >
          Agencies
        </NavItem>
        <NavItem
          href="/developer/hospitals"
          icon={Building2}
          active={pathname === "/developer/hospitals"}
        >
          Hospitals
        </NavItem>
        <NavItem
          href="/developer/clients"
          icon={UserCheck}
          active={pathname === "/developer/clients"}
        >
          Klien
        </NavItem>

        {/* ── Developer Tools ── */}
        <div className="px-2 pb-1 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2">Dev Tools</p>
        </div>
        <NavItem
          href="/developer/sandbox"
          icon={FlaskConical}
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
          <span>Sign Out</span>
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
            <Image
              src={LOGO_URL}
              alt="AsistenQu Developer"
              width={120}
              height={24}
              className="h-5 w-auto object-contain"
            />
          </Link>
        </DashboardHeader>
      }
    >
      <div className="pb-10">{children}</div>
    </DashboardLayout>
  );
}
