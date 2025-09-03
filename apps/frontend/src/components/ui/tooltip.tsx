import {ComponentProps} from "react"
import {Provider, Root, Content, Arrow, Portal, Trigger} from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof Provider>) {
  return (
    <Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: ComponentProps<typeof Root>) {
  return (
    <TooltipProvider>
      <Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: ComponentProps<typeof Trigger>) {
  return <Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: ComponentProps<typeof Content>) {
  return (
    <Portal>
      <Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "df:bg-primary df:text-primary-foreground df:animate-in df:fade-in-0 df:zoom-in-95 df:data-[state=closed]:animate-out df:data-[state=closed]:fade-out-0 df:data-[state=closed]:zoom-out-95 df:data-[side=bottom]:slide-in-from-top-2 df:data-[side=left]:slide-in-from-right-2 df:data-[side=right]:slide-in-from-left-2 df:data-[side=top]:slide-in-from-bottom-2 df:z-50 df:w-fit df:origin-(--radix-tooltip-content-transform-origin) df:rounded-md df:px-3 df:py-1.5 df:text-xs df:text-balance",
          className
        )}
        {...props}
      >
        {children}
        <Arrow className="df:bg-primary df:fill-primary df:z-50 df:size-2.5 df:translate-y-[calc(-50%_-_2px)] df:rotate-45 df:rounded-[2px]" />
      </Content>
    </Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
