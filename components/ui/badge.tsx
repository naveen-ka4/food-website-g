import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-[color-mix(in_oklch,var(--secondary),var(--foreground)_10%)]",
        outline:
          "border border-border bg-card text-foreground",
        sage:
          "bg-[color-mix(in_oklch,var(--accent),transparent_82%)] text-accent border border-accent/30 font-medium",
        vegetarian:
          "bg-[color-mix(in_oklch,var(--accent),transparent_82%)] text-accent border border-accent/30 font-medium",
        butter:
          "bg-secondary text-secondary-foreground border border-secondary/40",
        destructive:
          "bg-[color-mix(in_oklch,var(--destructive),transparent_85%)] text-destructive border border-destructive/30",
        soft:
          "bg-muted text-foreground border border-border/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
