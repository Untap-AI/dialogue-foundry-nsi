import {ComponentProps} from "react"
import {Root, Viewport, Scrollbar as ScrollAreaScrollbar, Corner, ScrollAreaThumb } from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ComponentProps<typeof Root>) {
  return (
    <Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <Viewport
        data-slot="scroll-area-viewport"
        className="df:focus-visible:ring-ring/50 df:size-full df:rounded-[inherit] df:transition-[color,box-shadow] df:outline-none df:focus-visible:ring-[3px] df:focus-visible:outline-1"
      >
        {children}
      </Viewport>
      <ScrollBar />
      <Corner />
    </Root>
  )
}

function ScrollBar({
  className,
  thumbClassName,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaScrollbar> & { thumbClassName?: string }) {
  return (
    <ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "df:flex df:touch-none df:p-px df:transition-colors df:select-none",
        orientation === "vertical" &&
          "df:h-full df:w-2.5 df:border-l df:border-l-transparent",
        orientation === "horizontal" &&
          "df:h-2.5 df:flex-col df:border-t df:border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn("df:bg-border df:relative df:flex-1 df:rounded-full", thumbClassName)}
      />
    </ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
