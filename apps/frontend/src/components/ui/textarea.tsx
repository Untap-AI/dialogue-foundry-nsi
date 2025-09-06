import {ComponentProps} from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "df:border-input df:placeholder:text-muted-foreground df:focus-visible:border-ring df:focus-visible:ring-ring/50 df:aria-invalid:ring-destructive/20 df:aria-invalid:border-destructive df:flex df:field-sizing-content df:min-h-16 df:w-full df:rounded-md df:border df:bg-transparent df:px-3 df:py-2 df:text-base df:shadow-xs df:transition-[color,box-shadow] df:outline-none df:focus-visible:ring-[3px] df:disabled:cursor-not-allowed df:disabled:opacity-50 df:md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
