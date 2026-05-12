"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { DashboardLayout, DashboardSidebar, DashboardHeader, SidebarHeader, SidebarContent, SidebarFooter, NavItem } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Settings, LogOut, Users, UserCog, FileText, GitPullRequest, Search, ShieldCheck, Network, Building2, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { CommandPalette } from "@/components/admin-agency/command-palette"
import { AIAgencyAssistantWidget } from "@/components/admin-agency/ai-assistant-widget";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Notifications } from "@/components/dashboard/notifications";
import { useBusy } from "@/components/ui/busy-overlay-provider";

export function AdminAgencyLayoutClient({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { run } = useBusy();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await run(async () => {
      try {
        await fetch("/api/auth/logout?from=admin-agency", { method: "POST" });
      } catch (e) {
        console.error("Logout failed", e);
      }
      router.push("/admin-agency/login");
      router.refresh();
    }, "Keluar…");
  }, [router, run]);

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/admin-agency">
          <Logo height={28} />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <button
          onClick={() => setIsCommandOpen(true)}
          className="w-full mt-2 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all text-[15px] font-medium cursor-pointer overflow-hidden shadow-sm"
        >
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate tracking-wide flex-1 text-left min-w-0">{t.searchPrompt}</span>
        </button>

        <div className="mt-2 flex flex-col gap-1 w-full">
          <NavItem href="/admin-agency" icon={LayoutDashboard} active={pathname === '/admin-agency'} isCollapsed={false}>
            {t.dashboard}
          </NavItem>
          {/* ── People ────────────────────────────────────────── */}
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-4 mb-1">Orang</p>
          <NavItem href="/admin-agency/agents" icon={Users} active={pathname.startsWith('/admin-agency/agents')} isCollapsed={false}>
            Agen
          </NavItem>
          <NavItem href="/admin-agency/team" icon={UserCog} active={pathname.startsWith('/admin-agency/team')} isCollapsed={false}>
            Staff Internal
          </NavItem>
          <NavItem href="/admin-agency/clients" icon={ShieldCheck} active={pathname.startsWith('/admin-agency/clients')} isCollapsed={false}>
            {t.clients}
          </NavItem>
          <NavItem href="/admin-agency/organization" icon={Network} active={pathname.startsWith('/admin-agency/organization')} isCollapsed={false}>
            Organisasi
          </NavItem>

          {/* ── Operations ────────────────────────────────────── */}
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-4 mb-1">Operasional</p>
          <NavItem href="/admin-agency/claims" icon={FileText} active={pathname.startsWith('/admin-agency/claims')} isCollapsed={false}>
            {t.claims}
          </NavItem>
          <NavItem href="/admin-agency/transfers" icon={GitPullRequest} active={pathname.startsWith('/admin-agency/transfers')} isCollapsed={false}>
            {t.transferRequests}
          </NavItem>
          <NavItem href="/admin-agency/performance" icon={BarChart3} active={pathname.startsWith('/admin-agency/performance')} isCollapsed={false}>
            {t.agencyPerformance}
          </NavItem>
          <NavItem href="/admin-agency/network" icon={Building2} active={pathname.startsWith('/admin-agency/network')} isCollapsed={false}>
            Marketplace
          </NavItem>
          {/* ── System ───────────────────────────────────────── */}
          <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase px-4 mt-4 mb-1">Sistem</p>
          <NavItem href="/admin-agency/settings" icon={Settings} active={pathname === '/admin-agency/settings'} isCollapsed={false}>
            {t.settings}
          </NavItem>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <button
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 mt-2 text-[15px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 ease-out group"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0 text-red-500 group-hover:text-red-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t.logout}</span>
        </button>
      </SidebarFooter>
    </DashboardSidebar>
  )

  return (
    <>
      <DashboardLayout sidebar={sidebar} isCollapsed={false} header={
        <DashboardHeader mobileSidebar={sidebar} actions={<Notifications />}>
          <Link href="/admin-agency">
            <Logo height={20} />
          </Link>
        </DashboardHeader>
      }>
        {children}
      </DashboardLayout>
      <CommandPalette isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} />
      <AIAgencyAssistantWidget />
    </>
  )
}
