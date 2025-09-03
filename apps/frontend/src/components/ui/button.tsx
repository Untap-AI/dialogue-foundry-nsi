import {ComponentProps} from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "df:inline-flex df:items-center df:justify-center df:gap-2 df:whitespace-nowrap df:rounded-sm df:text-sm df:font-medium df:transition-all df:disabled:pointer-events-none df:disabled:opacity-50 df:[&_svg]:pointer-events-none df:[&_svg:not([class*='size-'])]:size-4 df:shrink-0 df:[&_svg]:shrink-0 df:outline-none df:focus-visible:border-ring df:focus-visible:ring-ring/50 df:focus-visible:ring-[3px] df:aria-invalid:ring-destructive/20 df:aria-invalid:border-destructive df:cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "df:bg-primary df:text-primary-foreground df:shadow-xs df:hover:bg-primary/90",
        destructive:
          "df:bg-destructive df:text-white df:shadow-xs df:hover:bg-destructive/90 df:focus-visible:ring-destructive/20",
        outline:
          "df:border df:bg-background df:shadow-xs df:hover:bg-accent df:hover:text-accent-foreground",
        secondary:
          "df:bg-secondary df:text-secondary-foreground df:shadow-xs df:hover:bg-secondary/80",
        ghost:
          "df:hover:bg-accent df:hover:text-accent-foreground",
        link: "df:text-primary df:underline-offset-4 df:hover:underline",
      },
      size: {
        default: "df:h-9 df:px-4 df:py-2 df:has-[>svg]:px-3",
        sm: "df:h-8 df:rounded-sm df:gap-1.5 df:px-3 df:has-[>svg]:px-2.5",
        lg: "df:h-10 df:rounded-sm df:px-6 df:has-[>svg]:px-4",
        icon: "df:size-9 df:p-0",
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
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
