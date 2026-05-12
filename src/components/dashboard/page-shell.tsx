import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── PageShell ────────────────────────────────────────────────────────────────
// Standard outer wrapper for every dashboard page.
// Usage:
//   <PageShell>
//     <PageHeader title="…" description="…" actions={<Button>…</Button>} />
//     {/* cards, tables, etc. */}
//   </PageShell>

interface PageShellProps {
  children: React.ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-8 animate-in fade-in duration-500 w-full",
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
// Consistent top-of-page header used by every dashboard page.
// Renders: title + optional description on the left, optional actions on the right.
// Always has a bottom border.

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-gray-100",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-gray-500 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:mt-0.5">
          {actions}
        </div>
      )}
    </div>
  )
}

// ─── CardShell ────────────────────────────────────────────────────────────────
// Standard white card container used throughout dashboards.

interface CardShellProps {
  children: React.ReactNode
  className?: string
}

export function CardShell({ children, className }: CardShellProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  )
}

// ─── CardHeader ───────────────────────────────────────────────────────────────
// Header bar inside a CardShell.

interface CardHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4",
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 truncate">{title}</h2>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
// Enterprise stat card — consistent across all portals.
// Clean, minimal, no decorative effects.

interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ElementType
  description?: string
  href?: string
  linkLabel?: string
  className?: string
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  href,
  linkLabel = "Lihat",
  className,
  onClick,
}: StatCardProps) {
  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3", 
        onClick && "cursor-pointer hover:bg-gray-50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-400" strokeWidth={1.75} />}
          <span className="text-sm font-medium text-gray-500">{label}</span>
        </div>
        {href && (
          <Link
            href={href}
            className="text-xs font-medium text-gray-400 hover:text-gray-900 flex items-center gap-1 transition-colors"
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight">{value}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  )
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────
// Responsive grid wrapper for StatCards.

interface StatsGridProps {
  children: React.ReactNode
  cols?: 2 | 3 | 4
  className?: string
}

export function StatsGrid({ children, cols = 3, className }: StatsGridProps) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[cols]

  return (
    <div className={cn(`grid grid-cols-1 ${colClass} gap-4`, className)}>
      {children}
    </div>
  )
}
