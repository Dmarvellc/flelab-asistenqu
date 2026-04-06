import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Canonical status tokens used across the platform.
 * Add new statuses here — DO NOT inline ad-hoc colored badges.
 */
export const STATUS_TOKENS = {
  // User lifecycle
  ACTIVE:     { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  PENDING:    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",   label: "Pending" },
  REJECTED:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Rejected" },
  SUSPENDED:  { bg: "bg-gray-100",   text: "text-gray-600",    dot: "bg-gray-400",    label: "Suspended" },
  INACTIVE:   { bg: "bg-gray-100",   text: "text-gray-500",    dot: "bg-gray-300",    label: "Inactive" },
  DRAFT:      { bg: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300",    label: "Draft" },

  // Claim lifecycle
  DRAFT_AGENT:    { bg: "bg-gray-50",    text: "text-gray-600",   dot: "bg-gray-300",   label: "Draft" },
  PENDING_LOG:    { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400",  label: "Pending Log" },
  LOG_ISSUED:     { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500",   label: "Log Issued" },
  PENDING_REVIEW: { bg: "bg-amber-50",   text: "text-amber-800",  dot: "bg-amber-500",  label: "Pending Review" },
  APPROVED:       { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500",label: "Approved" },
  COMPLETED:      { bg: "bg-emerald-50", text: "text-emerald-800",dot: "bg-emerald-600",label: "Completed" },
  INFO_REQUESTED: { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500", label: "Info Requested" },
  SUBMITTED:      { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500",   label: "Submitted" },
} as const

export type StatusKey = keyof typeof STATUS_TOKENS

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusKey | string
  size?: "xs" | "sm" | "md"
  showDot?: boolean
  /** Override label display (defaults to token label or raw status string) */
  label?: string
}

const SIZE_CLASSES = {
  xs: "text-[10px] px-1.5 py-0.5 gap-1",
  sm: "text-[11px] px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-1.5",
} as const

const DOT_SIZE = {
  xs: "w-1 h-1",
  sm: "w-1.5 h-1.5",
  md: "w-1.5 h-1.5",
} as const

/**
 * Canonical status indicator. Always use this instead of ad-hoc colored spans.
 *
 * @example
 *   <StatusBadge status="ACTIVE" />
 *   <StatusBadge status="PENDING" size="md" />
 *   <StatusBadge status="APPROVED" showDot={false} />
 */
function StatusBadge({
  status,
  size = "sm",
  showDot = true,
  label,
  className,
  ...props
}: StatusBadgeProps) {
  const token = STATUS_TOKENS[status as StatusKey] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: String(status),
  }

  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center rounded-full font-bold tracking-wide uppercase whitespace-nowrap",
        SIZE_CLASSES[size],
        token.bg,
        token.text,
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("rounded-full shrink-0", DOT_SIZE[size], token.dot)} aria-hidden="true" />
      )}
      {label ?? token.label}
    </span>
  )
}

export { StatusBadge }
export type { StatusBadgeProps }
