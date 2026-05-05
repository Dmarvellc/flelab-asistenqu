"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
    DashboardLayout,
    DashboardSidebar,
    DashboardHeader,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    NavItem,
} from "@/components/dashboard/dashboard-layout"

import { LayoutDashboard, Users, FileText, LogOut, Settings, ClipboardList, Stethoscope, CalendarCheck, Gift, Globe, Search, Bell } from "lucide-react"
import { Notifications } from "@/components/dashboard/notifications";
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/ui/logo"
import { I18nProvider, useTranslation } from "@/components/providers/i18n-provider"
import { useAgencyBranding } from "@/components/providers/agency-branding-provider"
import { CommandPalette } from "@/components/agent/command-palette"
import { AIAssistantWidget } from "@/components/agent/ai-assistant-widget"


export function AgentLayoutClient({ children, initialBadges, serverUserName }: { children: React.ReactNode, initialBadges: { pendingContracts: number, pendingRequests: number, totalClaims: number }, serverUserName: string | null }) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, lang, setLang } = useTranslation();
    const branding = useAgencyBranding();
    // Determine base path (supports /{slug}/agent or /agent)
    const pathSegments = pathname.split("/").filter(Boolean);
    const isSlugRoute = pathSegments.length >= 2 && pathSegments[1] === "agent" && pathSegments[0] !== "agent";
    const basePath = isSlugRoute ? `/${pathSegments[0]}/agent` : "/agent";
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [userName, setUserName] = useState<string | null>(serverUserName);
    const [badges, setBadges] = useState(initialBadges);
    const [isCommandOpen, setIsCommandOpen] = useState(false);

    const isPublicPage = pathname.endsWith("/login") || pathname.endsWith("/register");

    const handleLogout = useCallback(async () => {
        try {
            await fetch("/api/auth/logout?from=agent", { method: "POST" });
        } catch (e) {
            console.error("Logout failed", e);
        }
        localStorage.removeItem("user");
        setIsAuthorized(false);
        router.push(`${basePath}/login`);
    }, [router, basePath]);

    useEffect(() => {
        if (isPublicPage) {
            setIsAuthorized(true);
            setIsChecking(false);
            return;
        }
        // Auth is handled by middleware — trust the server session.
        // localStorage is only used to enrich the display name.
        try {
            const raw = localStorage.getItem("user");
            if (raw) {
                const parsed = JSON.parse(raw);
                const localName = parsed.email || parsed.name || null;
                if (localName && !serverUserName) setUserName(localName);
            }
        } catch { }
        setIsAuthorized(true);
        setIsChecking(false);
    }, [pathname, isPublicPage, serverUserName]);

    if (isChecking && !isPublicPage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
                <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        )
    }

    if (!isChecking && !isAuthorized && !isPublicPage) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
                <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
            </div>
        )
    }

    if (isPublicPage) return <>{children}</>;
    if (pathname === `${basePath}/verification`) return <>{children}</>;
    if (pathname.endsWith("/print")) return <>{children}</>;

    const navItems = [
        { href: basePath, icon: LayoutDashboard, label: t.dashboard, exact: true, badge: undefined },
        { href: `${basePath}/clients`, icon: Users, label: t.clients, badge: undefined },
        { href: `${basePath}/claims`, icon: FileText, label: t.claims, badge: badges.totalClaims || undefined },
        { href: `${basePath}/appointments`, icon: CalendarCheck, label: t.appointments, badge: undefined },
        { href: `${basePath}/reminders`, icon: Bell, label: "Pengingat", badge: undefined },
        { href: `${basePath}/requests`, icon: ClipboardList, label: t.requests, badge: badges.pendingRequests || undefined },
        { href: `${basePath}/network`, icon: Stethoscope, label: "Marketplace", badge: undefined },
        { href: `${basePath}/referral`, icon: Gift, label: t.referral, badge: undefined },
        { href: `${basePath}/settings`, icon: Settings, label: t.settings, badge: undefined },
    ];

    const isNavActive = (href: string, exact = false) => {
        if (exact) return pathname === href;
        return pathname === href || pathname.startsWith(href + "/");
    };

    const sidebar = (
        <DashboardSidebar>
            <SidebarHeader>
                <Link href={basePath}>
                    {branding.logoUrl ? (
                        <Image
                            src={branding.logoUrl}
                            alt="Logo"
                            width={200}
                            height={40}
                            className="h-8 w-auto object-contain"
                        />
                    ) : (
                        <Logo height={28} />
                    )}
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
                    <div className="mb-6 px-2">
                        <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-1">Masuk sebagai</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                    </div>
                )}

                {/* Language Switch */}
                <div className="flex items-center justify-between px-2 py-3 text-gray-500 mb-2 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span>Bahasa</span>
                    </div>
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shadow-inner">
                        <button
                            onClick={() => setLang('en')}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLang('id')}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md transition-all ${lang === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            ID
                        </button>
                    </div>
                </div>

                <button
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 mt-2 text-[15px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 ease-out group"
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5 shrink-0 text-red-500 group-hover:text-red-600 group-hover:-translate-x-0.5 transition-transform" />
                    <span>{t.logout}</span>
                </button>
            </SidebarFooter>
        </DashboardSidebar>
    );

    return (
        <>
            <DashboardLayout fabInset sidebar={sidebar} isCollapsed={false} header={
                <DashboardHeader mobileSidebar={sidebar} actions={<Notifications />}>
                    <Link href={basePath}>
                        {branding.logoUrl ? (
                            <Image
                                src={branding.logoUrl}
                                alt="Logo"
                                width={120}
                                height={24}
                                className="h-5 w-auto object-contain"
                            />
                        ) : (
                            <Logo height={20} />
                        )}
                    </Link>
                </DashboardHeader>
            }>
                {children}
            </DashboardLayout>
            <CommandPalette isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} />
            <AIAssistantWidget />
        </>
    )
}
