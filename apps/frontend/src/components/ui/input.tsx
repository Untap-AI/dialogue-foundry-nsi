import {ComponentProps} from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "df:placeholder:text-muted-foreground df:selection:bg-primary df:selection:text-primary-foreground df:border-input df:flex df:h-9 df:w-full df:min-w-0 df:rounded-md df:border df:bg-transparent df:px-3 df:py-1 df:text-base df:shadow-xs df:transition-[color,box-shadow] df:outline-none df:disabled:pointer-events-none df:disabled:cursor-not-allowed df:disabled:opacity-50 df:md:text-sm",
        "df:focus-visible:border-ring df:focus-visible:ring-ring/50 df:focus-visible:ring-[3px]",
        "df:aria-invalid:ring-destructive/20 df:aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
