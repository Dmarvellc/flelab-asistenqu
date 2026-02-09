import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const scrollAreaVariants = cva(
  "relative overflow-hidden",
  {
    variants: {
      orientation: {
        vertical: "h-full w-full",
        horizontal: "w-full",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof scrollAreaVariants> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(scrollAreaVariants({ orientation }), className)}
      {...props}
    >
      <div className="h-full w-full overflow-auto scrollbar-hide">
        {children}
      </div>
    </div>
  )
)
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
