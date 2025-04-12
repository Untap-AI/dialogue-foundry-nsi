import React, { useCallback } from 'react'
import './PopupMessage.css'
import { useConfig } from '../../contexts/ConfigContext'

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
    <div className="chat-popup-message" style={{ ...getPosition() }}>
      <div>{popupMessage}</div>
      <div className="chat-popup-arrow"></div>
    </div>
  )
}
