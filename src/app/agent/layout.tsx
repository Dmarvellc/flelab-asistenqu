"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  DashboardLayout,
  DashboardSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  NavItem,
} from "@/components/dashboard/dashboard-layout"
import { EmergencyButton } from "@/components/claims/emergency-button"
import { LayoutDashboard, Users, FileText, LogOut, Settings, ClipboardList, Stethoscope } from "lucide-react"
import Link from "next/link"

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [badges, setBadges] = useState({ pendingContracts: 0, totalClaims: 0 });

  const isPublicPage = pathname === "/agent/login" || pathname === "/agent/register";

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout?from=agent", { method: "POST" });
    } catch (e) {
      console.error("Logout failed", e);
    }
    localStorage.removeItem("user");
    setIsAuthorized(false);
    router.push("/agent/login");
  }, [router]);

  useEffect(() => {
    if (isPublicPage) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }
    const user = localStorage.getItem("user");
    if (!user) {
      setIsAuthorized(false);
      setIsChecking(false);
      handleLogout();
    } else {
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.email || parsed.name || null);
      } catch { }
      setIsAuthorized(true);
      setIsChecking(false);
    }
  }, [pathname, isPublicPage, handleLogout]);

  // Fetch badge counts once authorized
  useEffect(() => {
    if (!isAuthorized || isPublicPage) return;
    fetch("/api/agent/metrics")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBadges({ pendingContracts: data.pendingContracts || 0, totalClaims: data.totalClaims || 0 });
      })
      .catch(() => { });
  }, [isAuthorized, isPublicPage]);

  if (isChecking && !isPublicPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
      </div>
    )
  }

  if (!isChecking && !isAuthorized && !isPublicPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
      </div>
    )
  }

  if (isPublicPage) return <>{children}</>;
  if (pathname === "/agent/verification") return <>{children}</>;

  const navItems = [
    { href: "/agent", icon: LayoutDashboard, label: "Dasbor", exact: true, badge: undefined },
    { href: "/agent/clients", icon: Users, label: "Klien", badge: undefined },
    { href: "/agent/claims", icon: FileText, label: "Klaim", badge: badges.totalClaims || undefined },
    { href: "/agent/requests", icon: ClipboardList, label: "Permintaan", badge: badges.pendingContracts || undefined },
    { href: "/agent/doctors", icon: Stethoscope, label: "Dokter", badge: undefined },
    { href: "/agent/settings", icon: Settings, label: "Pengaturan", badge: undefined },
  ];

  const isNavActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebar = (
    <DashboardSidebar>
      {/* Brand */}
      <SidebarHeader>
        <Link href="/agent">
          <p className="font-semibold text-sm text-white tracking-tight">AsistenQu Agent</p>
        </Link>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            active={isNavActive(item.href, item.exact)}
            isCollapsed={false}
            badge={item.badge}
          >
            {item.label}
          </NavItem>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        {userName && (
          <p className="text-[11px] text-white/25 px-3 mb-1.5 truncate">{userName}</p>
        )}
        <button
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/35 hover:bg-white/[0.06] hover:text-white/60 transition-all duration-150"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>Keluar</span>
        </button>
      </SidebarFooter>
    </DashboardSidebar>
  );

  return (
    <DashboardLayout sidebar={sidebar} isCollapsed={false}>
      {children}
      <EmergencyButton unitLabel="Tim Agen / Case Manager" />
    </DashboardLayout>
  )
}
