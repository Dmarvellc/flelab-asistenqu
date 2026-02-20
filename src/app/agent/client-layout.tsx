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

import { LayoutDashboard, Users, FileText, LogOut, Settings, ClipboardList, Stethoscope, CalendarCheck, Gift, Globe, Search } from "lucide-react"
import Link from "next/link"
import { I18nProvider, useTranslation } from "@/components/providers/i18n-provider"
import { CommandPalette } from "@/components/agent/command-palette"

export function AgentLayoutClient({ children, initialBadges, serverUserName }: { children: React.ReactNode, initialBadges: { pendingContracts: number, totalClaims: number }, serverUserName: string | null }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, lang, setLang } = useTranslation();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [userName, setUserName] = useState<string | null>(serverUserName);
    const [badges, setBadges] = useState(initialBadges);
    const [isCommandOpen, setIsCommandOpen] = useState(false);

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
        if (!user && !serverUserName) {
            setIsAuthorized(false);
            setIsChecking(false);
            handleLogout();
        } else {
            try {
                if (user) {
                    const parsed = JSON.parse(user);
                    setUserName(parsed.email || parsed.name || serverUserName || null);
                }
            } catch { }
            setIsAuthorized(true);
            setIsChecking(false);
        }
    }, [pathname, isPublicPage, handleLogout, serverUserName]);

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
    if (pathname.endsWith("/print")) return <>{children}</>;

    const navItems = [
        { href: "/agent", icon: LayoutDashboard, label: t.dashboard, exact: true, badge: undefined },
        { href: "/agent/clients", icon: Users, label: t.clients, badge: undefined },
        { href: "/agent/claims", icon: FileText, label: t.claims, badge: badges.totalClaims || undefined },
        { href: "/agent/appointments", icon: CalendarCheck, label: t.appointments, badge: undefined },
        { href: "/agent/requests", icon: ClipboardList, label: t.requests, badge: badges.pendingContracts || undefined },
        { href: "/agent/doctors", icon: Stethoscope, label: t.doctors, badge: undefined },
        { href: "/agent/referral", icon: Gift, label: t.referral, badge: undefined },
        { href: "/agent/settings", icon: Settings, label: t.settings, badge: undefined },
    ];

    const isNavActive = (href: string, exact = false) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const sidebar = (
        <DashboardSidebar>
            <SidebarHeader>
                <Link href="/agent">
                    <p className="font-semibold text-sm text-white tracking-tight">AsistenQu Agent</p>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                <button
                    onClick={() => setIsCommandOpen(true)}
                    className="w-full mt-4 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all text-sm font-medium cursor-pointer overflow-hidden"
                >
                    <Search className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate tracking-wide flex-1 text-left min-w-0">{t.searchPrompt}</span>
                </button>

                <div className="mt-2 space-y-1 w-full">
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
                </div>
            </SidebarContent>

            <SidebarFooter>
                {userName && (
                    <p className="text-[11px] font-medium text-white/40 px-3 py-1 mb-1 truncate">{userName}</p>
                )}

                {/* Language Switch */}
                <div className="flex items-center justify-between px-3 py-2 text-white/40 mb-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Language</span>
                    </div>
                    <div className="flex gap-1 bg-white/5 rounded-md p-0.5">
                        <button
                            onClick={() => setLang('en')}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${lang === 'en' ? 'bg-white text-black font-semibold' : 'hover:text-white transition-colors'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang('id')}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${lang === 'id' ? 'bg-white text-black font-semibold' : 'hover:text-white transition-colors'}`}
                        >
                            ID
                        </button>
                    </div>
                </div>

                <button
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 mt-1 text-sm font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
                    onClick={handleLogout}
                >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.logout}</span>
                </button>
            </SidebarFooter>
        </DashboardSidebar>
    );

    return (
        <>
            <DashboardLayout sidebar={sidebar} isCollapsed={false}>
                {children}
            </DashboardLayout>
            <CommandPalette isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} />
        </>
    )
}
