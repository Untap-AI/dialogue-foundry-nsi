import React, { useCallback } from 'react'
import { useConfig } from '../../contexts/ConfigContext'
import { cn } from '@/lib/utils'

interface PopupMessageProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>
}

export const PopupMessage: React.FC<PopupMessageProps> = ({ buttonRef }) => {
  const { popupMessage } = useConfig()

  // Calculate position relative to the button
  const getPosition = useCallback(() => {
    if (!buttonRef.current) return { insetInlineEnd: '20px', bottom: '80px' }

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const buttonHeight = buttonRect.height
    // Use button height + an offset to calculate position
    const offset = buttonHeight + 33

    return {
      insetInlineEnd: '20px',
      bottom: `${offset}px`
    }
  }, [buttonRef])

  return (
    <div 
      className={cn(
        "df:fixed df:animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)] df:drop-shadow-md",
        "df:text-base df:bg-primary df:text-primary-foreground df:rounded-[10px] df:px-5 df:py-4",
        "df:shadow-[0_6px_16px_rgba(0,0,0,0.18)] df:max-w-80 df:md:max-w-[80vw]"
      )}
      style={{ ...getPosition() }}
    >
      <div>{popupMessage}</div>
      <div className="df:absolute df:w-0 df:h-0 df:border-l-[10px] df:border-l-transparent df:border-r-[10px] df:border-r-transparent df:border-t-[10px] df:border-t-primary df:-bottom-[10px] df:right-5"></div>
    </div>
  )
}
