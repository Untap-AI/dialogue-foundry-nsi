import { useState, useRef, useEffect, useCallback } from 'react'
import ChatIcon from './ChatIcon'
import ChatWindow from './ChatWindow'

export interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left'
  buttonColor?: string
  title?: string
  logoUrl?: string
  defaultOpen?: boolean
}

export const ChatWidget = ({
  position = 'bottom-right',
  buttonColor = '#222',
  title = 'West Hills Vineyard',
  logoUrl,
  defaultOpen = false
}: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
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

  // Position classes based on the position prop
  const positionClasses =
    position === 'bottom-right' ? 'right-5 bottom-5' : 'left-5 bottom-5'

  return (
    <div className={`fixed z-[9999] ${positionClasses}`}>
      {/* Chat window */}
      {(isOpen || isClosing) && (
        <ChatWindow
          ref={chatWindowRef}
          isOpen={isOpen}
          isClosing={isClosing}
          title={title}
          logoUrl={logoUrl}
          position={position}
          onClose={toggleChat}
        />
      )}

      {/* Chat button */}
      <ChatIcon
        onClick={toggleChat}
        buttonColor={buttonColor}
        isOpen={isOpen}
      />
    </div>
  )
}

export default ChatWidget
