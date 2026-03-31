import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/90 backdrop-blur-md text-primary-foreground hover:bg-primary hover:shadow-lg hover:-translate-y-0.5 border border-white/10 rounded-2xl shadow-md",
        destructive:
          "bg-destructive/90 backdrop-blur-md text-destructive-foreground hover:bg-destructive hover:shadow-lg hover:-translate-y-0.5 border border-white/10 rounded-2xl shadow-md",
        outline:
          "border border-border/40 bg-background/50 backdrop-blur-md hover:bg-accent/70 hover:text-accent-foreground hover:shadow-md hover:-translate-y-0.5 rounded-2xl",
        secondary:
          "bg-secondary/70 backdrop-blur-md text-secondary-foreground hover:bg-secondary/90 hover:shadow-lg hover:-translate-y-0.5 border border-white/10 rounded-2xl shadow-sm",
        ghost: "hover:bg-accent/50 backdrop-blur-sm hover:text-accent-foreground hover:shadow-sm rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline rounded-md",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-xl px-4 py-2",
        lg: "h-14 rounded-2xl px-8 py-4",
        icon: "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
