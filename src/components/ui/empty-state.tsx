import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon component */
  icon?: LucideIcon
  /** Primary heading */
  title: string
  /** Supporting description */
  description?: string
  /** CTA or additional content below the description */
  action?: React.ReactNode
  /** Visual size */
  size?: "sm" | "md" | "lg"
  /** Orientation */
  orientation?: "vertical" | "horizontal"
}

const SIZE_CONFIG = {
  sm: {
    wrapper: "py-8 px-4 gap-3",
    icon: "size-8 mb-0",
    title: "text-sm font-semibold",
    description: "text-xs max-w-[280px]",
  },
  md: {
    wrapper: "py-12 px-6 gap-4",
    icon: "size-10 mb-1",
    title: "text-base font-semibold",
    description: "text-sm max-w-sm",
  },
  lg: {
    wrapper: "py-16 px-8 gap-5",
    icon: "size-12 mb-2",
    title: "text-lg font-semibold",
    description: "text-sm max-w-md",
  },
} as const

/**
 * Empty state placeholder for tables, lists, and pages with no data.
 * Always use this instead of ad-hoc "No results" paragraphs.
 *
 * @example
 *   <EmptyState
 *     icon={InboxIcon}
 *     title="No claims yet"
 *     description="Claims will appear here once submitted."
 *     action={<Button size="sm">Create Claim</Button>}
 *   />
 *
 * @example — compact inline
 *   <EmptyState size="sm" title="No results found" />
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  orientation = "vertical",
  className,
  ...props
}: EmptyStateProps) {
  const cfg = SIZE_CONFIG[size]

  if (orientation === "horizontal") {
    return (
      <div
        data-slot="empty-state"
        className={cn(
          "flex items-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50",
          cfg.wrapper,
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="flex items-center justify-center rounded-lg bg-gray-100 p-2.5 shrink-0">
            <Icon className={cn("text-gray-400", cfg.icon)} strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn("text-gray-700", cfg.title)}>{title}</p>
          {description && (
            <p className={cn("text-muted-foreground mt-1", cfg.description)}>
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )
  }

  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50",
        cfg.wrapper,
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="flex items-center justify-center rounded-full bg-gray-100 p-3">
          <Icon className={cn("text-gray-400", cfg.icon)} strokeWidth={1.5} />
        </div>
      )}
      <div className="space-y-1.5">
        <p className={cn("text-gray-700", cfg.title)}>{title}</p>
        {description && (
          <p className={cn("text-muted-foreground mx-auto", cfg.description)}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
export type { EmptyStateProps }
