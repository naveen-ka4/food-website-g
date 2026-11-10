import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary",
        outline:
          "border-border bg-card text-foreground shadow-2xs hover:bg-muted hover:text-foreground active:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground shadow-2xs hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] active:bg-secondary/90",
        ghost:
          "hover:bg-muted hover:text-foreground active:bg-muted/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/40",
        link:
          "text-foreground underline-offset-4 hover:underline rounded-none p-0 h-auto",
        /* New Variants from Hey Garlic Design Spec */
        sage:
          "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90 active:bg-accent focus-visible:ring-accent",
        success:
          "bg-accent text-accent-foreground shadow-xs hover:bg-accent/90 active:bg-accent focus-visible:ring-accent",
        soft:
          "bg-muted text-foreground hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)] active:bg-muted",
      },
      size: {
        default:
          "h-10 px-5 text-sm gap-2 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs:
          "h-7 px-3 text-xs gap-1.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm:
          "h-8.5 px-4 text-xs gap-1.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg:
          "h-12 px-7 text-base gap-2.5 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5 [&_svg:not([class*='size-'])]:size-5",
        icon:
          "size-10 rounded-xl",
        "icon-xs":
          "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm":
          "size-8.5 rounded-lg [&_svg:not([class*='size-'])]:size-4",
        "icon-lg":
          "size-12 rounded-xl [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
