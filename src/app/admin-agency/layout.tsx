"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Shield, Settings, LogOut, Users, FileText, GitPullRequest, Trophy, Search } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { CommandPalette } from "@/components/admin-agency/command-palette"
import { I18nProvider, useTranslation } from "@/components/providers/i18n-provider";
import { AIAgencyAssistantWidget } from "@/components/admin-agency/ai-assistant-widget";

export default function AdminAgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AdminAgencyLayoutContent>{children}</AdminAgencyLayoutContent>
    </I18nProvider>
  );
}

function AdminAgencyLayoutContent({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const isLoginPage = pathname === "/admin-agency/login";

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout?from=admin-agency", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    setIsAuthorized(false);
    router.push("/admin-agency/login");
  }, [router]);

  useEffect(() => {
    if (isLoginPage) {
      setIsChecking(false);
      return;
    }
    // Assuming authorization is handled by middleware or server, just basic check here
    setIsAuthorized(true);
    setIsChecking(false);
  }, [pathname, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    )
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/admin-agency">
          <Image
            src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_tagadmin.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX3RhZ2FkbWluLnBuZyIsImlhdCI6MTc3MTg5NzQwMSwiZXhwIjozMzI3NjM2MTQwMX0.O2gM-49fTWQWkUKRyDs_5tsEUF-l_RKJb3xft9UWg64"
            alt="AsistenQu Admin Agency"
            width={200}
            height={40}
            className="h-8 w-auto object-contain"
          />
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
          <NavItem href="/admin-agency/agents" icon={Users} active={pathname.startsWith('/admin-agency/agents')} isCollapsed={false}>
            {t.agents}
          </NavItem>
          <NavItem href="/admin-agency/clients" icon={Users} active={pathname.startsWith('/admin-agency/clients')} isCollapsed={false}>
            {t.clients}
          </NavItem>
          <NavItem href="/admin-agency/claims" icon={FileText} active={pathname.startsWith('/admin-agency/claims')} isCollapsed={false}>
            {t.claims}
          </NavItem>
          <NavItem href="/admin-agency/transfers" icon={GitPullRequest} active={pathname.startsWith('/admin-agency/transfers')} isCollapsed={false}>
            {t.transferRequests}
          </NavItem>
          <NavItem href="/admin-agency/performance" icon={Trophy} active={pathname.startsWith('/admin-agency/performance')} isCollapsed={false}>
            {t.agencyPerformance}
          </NavItem>
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
      <DashboardLayout sidebar={sidebar} isCollapsed={false}>
        {children}
      </DashboardLayout>
      <CommandPalette isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} />
      <AIAgencyAssistantWidget />
    </>
  )
}
