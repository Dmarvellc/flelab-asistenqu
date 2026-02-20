"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  header?: React.ReactNode
  isCollapsed?: boolean
}

export function DashboardLayout({
  children,
  sidebar,
  header,
  isCollapsed = false,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-[#f6f6f6]">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-20 hidden flex-col bg-[#0a0a0a] sm:flex transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[72px]" : "w-[220px]"
      )}>
        {sidebar}
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex flex-col w-full transition-all duration-300 ease-in-out",
        isCollapsed ? "sm:pl-[72px]" : "sm:pl-[220px]"
      )}>
        {header}
        <main className="flex-1 p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  mobile?: boolean
}

export function DashboardSidebar({ children, className, mobile, ...props }: SidebarProps) {
  return (
    <div className={cn("flex flex-col h-full overflow-hidden dark-scrollbar", className)} {...props}>
      {children}
    </div>
  )
}

interface SidebarHeaderProps {
  children: React.ReactNode
  className?: string
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return (
    <div className={cn(
      "flex h-16 items-center border-b border-white/[0.06] px-4",
      className
    )}>
      {children}
    </div>
  )
}

interface SidebarContentProps {
  children: React.ReactNode
}

export function SidebarContent({ children }: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 dark-scrollbar w-full">
      <nav className="grid items-start px-3 gap-0.5 w-full">
        {children}
      </nav>
    </div>
  )
}

interface SidebarFooterProps {
  children: React.ReactNode
  className?: string
}

export function SidebarFooter({ children, className }: SidebarFooterProps) {
  return (
    <div className={cn("border-t border-white/[0.06] p-3", className)}>
      {children}
    </div>
  )
}

interface DashboardHeaderProps {
  children?: React.ReactNode
  mobileSidebar?: React.ReactNode
}

export function DashboardHeader({ children, mobileSidebar }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0a0a0a] px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="sm:hidden text-white/50 hover:text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[240px] bg-[#0a0a0a] border-r border-white/[0.06]">
          {mobileSidebar}
        </SheetContent>
      </Sheet>
      <div className="flex flex-1 items-center justify-end gap-3">
        {children}
      </div>
    </header>
  )
}

interface NavItemProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  active?: boolean
  isCollapsed?: boolean
  badge?: number
}

export function NavItem({ href, icon: Icon, children, active, isCollapsed, badge }: NavItemProps) {
  const pathname = usePathname();
  const isActive = active || pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-white/10 text-white shadow-sm"
          : "text-white/50 hover:bg-white/5 hover:text-white/90",
        isCollapsed && "justify-center px-0"
      )}
      title={isCollapsed && typeof children === 'string' ? children : undefined}
    >
      {/* Active indicator bar */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r-full -ml-3 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
      )}

      {/* Icon - Always show */}
      <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-all duration-200", isActive ? "text-white" : "text-white/50 group-hover:text-white/90 group-hover:scale-105")} />

      {/* Text label — only when not collapsed */}
      {!isCollapsed && (
        <span className="truncate tracking-wide flex-1 text-left min-w-0">{children}</span>
      )}

      {/* Badge */}
      {badge !== undefined && badge > 0 && !isCollapsed && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold bg-white/20 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
