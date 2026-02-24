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
import Image from "next/image"
import { I18nProvider, useTranslation } from "@/components/providers/i18n-provider"
import { CommandPalette } from "@/components/agent/command-palette"
import { AIAssistantWidget } from "@/components/agent/ai-assistant-widget"

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
                    <Image
                        src="https://jzupwygwzatugbrmqjau.supabase.co/storage/v1/object/sign/image/m_tagagent.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NWE4NDk3Zi1iNTdiLTQ1ZDMtOWI3ZC0yNDAxNzU4Njg1NTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZS9tX3RhZ2FnZW50LnBuZyIsImlhdCI6MTc3MTc2Mzk4NSwiZXhwIjozMzI3NjIyNzk4NX0.1mf2ApWgy64TXpQXboJXnSGFumPrOCvwn5u9p8EJmlI"
                        alt="AsistenQu Agent"
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
                        <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase mb-1">Logged in as</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                    </div>
                )}

                {/* Language Switch */}
                <div className="flex items-center justify-between px-2 py-3 text-gray-500 mb-2 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <span>Language</span>
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
            <DashboardLayout sidebar={sidebar} isCollapsed={false}>
                {children}
            </DashboardLayout>
            <CommandPalette isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} />
            <AIAssistantWidget />
        </>
    )
}
