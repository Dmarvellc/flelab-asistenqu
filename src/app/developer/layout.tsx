"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout, DashboardSidebar, SidebarHeader, SidebarContent, SidebarFooter, NavItem, DashboardHeader } from "@/components/dashboard/dashboard-layout"
import { LayoutDashboard, Key, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/developer/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <DashboardSidebar>
      <SidebarHeader>
        <Link href="/developer" className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-6 w-6" />
          <span>Developer Console</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavItem href="/developer" icon={LayoutDashboard} active>
          Dashboard
        </NavItem>
        <NavItem href="/developer/api-keys" icon={Key}>
          API Keys
        </NavItem>
        <NavItem href="/developer/settings" icon={Settings}>
          Settings
        </NavItem>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" className="w-full justify-start gap-2" asChild>
          <Link href="/api/auth/logout">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </Button>
      </SidebarFooter>
    </DashboardSidebar>
  )

  return (
    <DashboardLayout sidebar={sidebar} header={<DashboardHeader mobileSidebar={sidebar} />}>
      {children}
    </DashboardLayout>
  )
}
