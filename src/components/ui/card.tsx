import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Variant system — opt-in.
 * When `variant` is provided, the default shadcn Card styling is REPLACED
 * with the variant's surface styles. Callers should combine with `padding`
 * since CardHeader/Content/Footer no longer enforce px-6/py-6 when variant
 * is set (they keep the old behavior otherwise).
 *
 * When `variant` is NOT provided, this Card behaves identically to the
 * original shadcn Card: `rounded-xl border py-6 shadow-sm gap-6`.
 */
const cardVariants = cva("flex flex-col border transition-shadow", {
  variants: {
    variant: {
      default:     "bg-card text-card-foreground border-gray-100 rounded-2xl shadow-sm",
      flat:        "bg-card text-card-foreground border-gray-100 rounded-xl shadow-none",
      elevated:    "bg-card text-card-foreground border-gray-100 rounded-2xl shadow-md hover:shadow-lg",
      marketing:   "bg-card text-card-foreground border-gray-100 rounded-3xl shadow-none",
      interactive: "bg-card text-card-foreground border-gray-100 rounded-2xl shadow-sm hover:border-gray-200 hover:shadow-md cursor-pointer",
      muted:       "text-card-foreground border-gray-100 rounded-2xl shadow-none bg-gray-50/50",
    },
    padding: {
      none:       "",
      sm:         "p-4 gap-4",
      default:    "p-6 gap-6",
      lg:         "p-8 gap-8",
      responsive: "p-4 sm:p-6 gap-4 sm:gap-6",
    },
  },
  defaultVariants: {
    padding: "default",
  },
})

interface CardProps extends React.ComponentProps<"div"> {
  variant?: VariantProps<typeof cardVariants>["variant"]
  padding?: VariantProps<typeof cardVariants>["padding"]
}

function Card({ className, variant, padding, ...props }: CardProps) {
  // Backward-compat: if no variant supplied, use the original shadcn styling
  if (!variant) {
    return (
      <div
        data-slot="card"
        className={cn(
          "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
          className
        )}
        {...props}
      />
    )
  }

  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
export type { CardProps }
