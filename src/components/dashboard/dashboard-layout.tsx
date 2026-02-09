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
}

export function DashboardLayout({
  children,
  sidebar,
  header,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex sm:w-64 transition-all">
        {sidebar}
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64 transition-all">
        {header}
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
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
}

export function SidebarHeader({ children }: SidebarHeaderProps) {
  return (
    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
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
}

export function SidebarFooter({ children }: SidebarFooterProps) {
  return (
    <div className="mt-auto border-t p-4">
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
        <SheetContent side="left" className="sm:max-w-xs">
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
}

export function NavItem({ href, icon: Icon, children, active }: NavItemProps) {
  const pathname = usePathname();
  const isActive = active || pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
        isActive ? "bg-muted text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}
