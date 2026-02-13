"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-10 hidden flex-col border-r border-zinc-800 bg-black text-white sm:flex transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {sidebar}
      </aside>
      <div className={cn(
        "flex flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "sm:pl-16" : "sm:pl-64"
      )}>
        {header}
        <main className="grid flex-1 items-start gap-4 p-6 md:gap-8 lg:p-10">
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
    <div className={cn("flex flex-col h-full", className)} {...props}>
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
    <div className={cn("flex h-14 items-center border-b border-zinc-800 px-4 lg:h-[60px] lg:px-6", className)}>
      {children}
    </div>
  )
}

interface SidebarContentProps {
  children: React.ReactNode
}

export function SidebarContent({ children }: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-auto py-2">
      <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
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
    <div className={cn("mt-auto border-t border-zinc-800 p-4", className)}>
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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs bg-black text-white border-zinc-800">
          {mobileSidebar}
        </SheetContent>
      </Sheet>
      {children}
    </header>
  )
}

interface NavItemProps {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  active?: boolean
  isCollapsed?: boolean
}

export function NavItem({ href, icon: Icon, children, active, isCollapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = active || pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-white hover:bg-zinc-900",
        isActive ? "bg-zinc-900 text-white" : "text-zinc-400",
        isCollapsed && "justify-center px-2"
      )}
      title={isCollapsed && typeof children === 'string' ? children : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span className="truncate">{children}</span>}
    </Link>
  )
}
