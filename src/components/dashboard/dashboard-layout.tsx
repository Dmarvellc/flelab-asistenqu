"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 w-full">
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
    <div className={cn("flex flex-col h-full overflow-hidden", className)} {...props}>
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
      "flex h-16 sm:h-[88px] items-center border-b border-gray-100 px-5 sm:px-8",
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
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 sm:py-6 w-full">
      <nav className="flex flex-col px-4 sm:px-6 gap-1.5 sm:gap-2 w-full">
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
    <div className={cn("border-t border-gray-100 p-4 sm:p-6", className)}>
      {children}
    </div>
  )
}

interface DashboardHeaderProps {
  children?: React.ReactNode
  mobileSidebar?: React.ReactNode
  /** Extra actions (notifications, etc.) rendered on the right side */
  actions?: React.ReactNode
}

export function DashboardHeader({ children, mobileSidebar, actions }: DashboardHeaderProps) {
  return (
    <header className="sm:hidden sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200/60 bg-white/98 backdrop-blur-sm px-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      {/* Mobile menu trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
            <span className="sr-only">Buka menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px] bg-white border-r border-gray-100 shadow-2xl">
          {mobileSidebar}
        </SheetContent>
      </Sheet>

      {/* Logo and branding */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end w-9 shrink-0">
        {actions}
      </div>
    </header>
  )
}

interface NavItemProps {
  href: string
  icon?: React.ElementType
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
        "group relative flex items-center rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-[15px] font-medium transition-all duration-300 ease-out",
        isActive
          ? "bg-gray-900 text-white shadow-md shadow-gray-900/10"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
        isCollapsed && "justify-center px-0"
      )}
      title={isCollapsed && typeof children === 'string' ? children : undefined}
    >
      {/* Active indicator bar */}
      {isActive && !isCollapsed && (
        <span className="absolute -left-4 sm:-left-6 top-1/2 -translate-y-1/2 w-[3px] sm:w-[4px] h-7 sm:h-8 bg-gray-900 rounded-r-full" />
      )}

      {isCollapsed && Icon && (
        <Icon className={cn("h-5 w-5 shrink-0 transition-all duration-300", isActive ? "text-white" : "text-gray-400 group-hover:text-gray-700 group-hover:scale-110")} />
      )}

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
