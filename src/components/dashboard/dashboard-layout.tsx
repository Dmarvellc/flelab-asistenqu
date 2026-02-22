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
    <div className="flex min-h-screen w-full bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-20 hidden flex-col bg-white border-r border-gray-200 sm:flex transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}>
        {sidebar}
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex flex-col w-full transition-all duration-300 ease-in-out",
        isCollapsed ? "sm:pl-[80px]" : "sm:pl-[260px]"
      )}>
        {header}
        <main className="flex-1 p-8 lg:p-12 xl:max-w-7xl xl:mx-auto w-full">
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
      "flex h-[88px] items-center border-b border-gray-100 px-8",
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 dark-scrollbar w-full">
      <nav className="grid items-start px-6 gap-2 w-full">
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
    <div className={cn("border-t border-gray-100 p-6", className)}>
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
    <header className="sticky top-0 z-30 flex h-[88px] items-center gap-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-8 shadow-sm">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="sm:hidden text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] bg-white border-r border-gray-200">
          {mobileSidebar}
        </SheetContent>
      </Sheet>
      <div className="flex flex-1 items-center justify-end gap-4">
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
        "group relative flex items-center gap-4 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-all duration-300 ease-out",
        isActive
          ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
        isCollapsed && "justify-center px-0"
      )}
      title={isCollapsed && typeof children === 'string' ? children : undefined}
    >
      {/* Active indicator bar */}
      {isActive && !isCollapsed && (
        <span className="absolute -left-6 top-1/2 -translate-y-1/2 w-[4px] h-8 bg-gray-900 rounded-r-full" />
      )}

      {/* Icon - Always show */}
      <Icon className={cn("h-5 w-5 shrink-0 transition-all duration-300", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700 group-hover:scale-110")} />

      {/* Text label — only when not collapsed */}
      {!isCollapsed && (
        <span className="truncate tracking-wide flex-1 text-left min-w-0">{children}</span>
      )}

      {/* Badge */}
      {badge !== undefined && badge > 0 && !isCollapsed && (
        <span className={cn(
          "ml-auto flex min-w-[24px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors",
          isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
