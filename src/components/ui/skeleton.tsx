import * as React from "react"
import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * Skeleton loader primitive.
 * Use instead of ad-hoc `bg-gray-100 animate-pulse rounded` divs.
 *
 * @example
 *   <Skeleton className="h-10 w-full rounded-xl" />
 *   <Skeleton className="h-4 w-32 rounded" />
 */
function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "animate-pulse bg-gray-100 rounded-md",
        className
      )}
      {...props}
    />
  )
}

/**
 * Skeleton row for table / list loaders.
 */
function SkeletonRow({
  columns = 4,
  className,
}: {
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3 py-3", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4 rounded",
            i === 0 ? "flex-[2]" : "flex-1"
          )}
        />
      ))}
    </div>
  )
}

/**
 * Skeleton text block.
 */
function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3 rounded", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonRow, SkeletonText }
