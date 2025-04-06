import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatButton } from '../ChatButton/ChatButton'
import { ChatWindow } from '../ChatWindow/ChatWindow'
import { MobileChatModal } from '../MobileChatModal/MobileChatModal'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import './ChatWidget.css'

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Use the resize observer hook with a 150ms debounce delay
  // Fast enough to feel responsive, but not too frequent to cause performance issues
  const { width } = useResizeObserver()
  // Determine if mobile based on current width
  const isMobile = width <= 768

  // eslint-disable-next-line no-null/no-null
  const chatWindowRef = useRef<HTMLDivElement | null>(null)

  const toggleChat = useCallback(() => {
    if (isOpen) {
      // For desktop view, start closing animation
      if (!isMobile) {
        setIsClosing(true)

        // After animation complete, set isOpen to false
        setTimeout(() => {
          setIsOpen(false)
          setIsClosing(false)
        }, 400)
      } else {
        // For mobile, just close immediately (modal handles animation)
        setIsOpen(false)
      }
    } else {
      setIsOpen(true)
    }
  }, [isOpen, isMobile])

  // Handle clicking outside to close chat (desktop only)
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

    // Only add the event listener if not on mobile
    if (!isMobile) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, toggleChat, isMobile])

  return (
    <div className="chat-widget">
      {/* Render either the desktop chat window or mobile modal based on screen size */}
      {isMobile ? (
        <MobileChatModal isOpen={isOpen} onClose={toggleChat} />
      ) : (
        <ChatWindow
          ref={chatWindowRef}
          isOpen={isOpen}
          isClosing={isClosing}
          onClose={toggleChat}
        />
      )}

      {/* Chat button */}
      <ChatButton onClick={toggleChat} isOpen={isOpen} />
    </div>
  )
}

export default ChatWidget
