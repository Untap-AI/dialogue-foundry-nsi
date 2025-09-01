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
        "fixed animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)] drop-shadow-md",
        "text-base bg-primary text-primary-foreground rounded-[10px] px-5 py-4",
        "shadow-[0_6px_16px_rgba(0,0,0,0.18)] max-w-80 md:max-w-[80vw]"
      )}
      style={{ ...getPosition() }}
    >
      <div>{popupMessage}</div>
      <div className="absolute w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-primary -bottom-[10px] right-5"></div>
    </div>
  )
}
