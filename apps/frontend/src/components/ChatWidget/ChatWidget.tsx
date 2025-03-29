import { useState, useRef, useEffect, useCallback } from 'react'
import ChatIcon from '../ChatIcon/ChatIcon'
import ChatWindow from '../ChatWindow/ChatWindow'
import { useConfig } from '../../contexts/ConfigContext'
import './ChatWidget.css'

export interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left'
  buttonColor?: string
  title?: string
  logoUrl?: string
  defaultOpen?: boolean
}

export const ChatWidget = ({
  position,
  buttonColor,
  title,
  logoUrl,
  defaultOpen
}: ChatWidgetProps) => {
  // Get configuration from context
  const { config } = useConfig()
  
  // Use props if provided, otherwise use config values with fallbacks
  const widgetPosition = position || config.widget?.position || 'bottom-right'
  const widgetButtonColor = buttonColor || config.widget?.buttonColor || '#2563eb'
  const widgetTitle = title || config.personaOptions?.assistant?.name || 'West Hills Vineyard'
  const widgetLogoUrl = logoUrl || config.personaOptions?.assistant?.avatar
  const widgetDefaultOpen = defaultOpen !== undefined ? defaultOpen : config.widget?.defaultOpen || false
  
  const [isOpen, setIsOpen] = useState(widgetDefaultOpen)
  const [isClosing, setIsClosing] = useState(false)
  // eslint-disable-next-line no-null/no-null
  const chatWindowRef = useRef<HTMLDivElement | null>(null)

  const toggleChat = useCallback(() => {
    if (isOpen) {
      // Start closing animation
      setIsClosing(true)
      // After animation complete, set isOpen to false
      setTimeout(() => {
        setIsOpen(false)
        setIsClosing(false)
      }, 400)
    } else {
      setIsOpen(true)
    }
  }, [isOpen])

  // Handle clicking outside to close chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        // Don't close if clicking on the button
        const target = event.target as HTMLElement
        if (target.closest('[data-chat-button]')) return

        toggleChat()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, toggleChat])

  const widgetClassName = `chat-widget ${widgetPosition}`

  return (
    <div className={widgetClassName}>
      {/* Chat Icon button with custom color */}
      <style>
        {`
          .chat-button {
            background-color: ${widgetButtonColor};
          }
        `}
      </style>
      
      {/* Chat window */}
      <ChatWindow
        ref={chatWindowRef}
        isOpen={isOpen}
        isClosing={isClosing}
        title={widgetTitle}
        logoUrl={widgetLogoUrl}
        position={widgetPosition}
        onClose={toggleChat}
      />

      {/* Chat button */}
      <ChatIcon onClick={toggleChat} isOpen={isOpen} />
    </div>
  )
}

export default ChatWidget
