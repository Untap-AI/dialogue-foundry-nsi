import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatButton } from '../ChatButton/ChatButton'
import { ChatWindow } from '../ChatWindow/ChatWindow'
import { MobileChatModal } from '../MobileChatModal/MobileChatModal'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import './ChatWidget.css'
import { useChatScroll } from '../../hooks/useChatScroll'
import { useConfig } from '../../contexts/ConfigContext'

export const ChatWidget = () => {
  const config = useConfig()
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

  useChatScroll({ isOpen })

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
      <ChatButton 
        onClick={toggleChat} 
        isOpen={isOpen} 
        config={{
          welcomePopup: config.welcomePopup || {
            enabled: false,
            message: '',
            delay: 2000,
            duration: 10000,
            fontSize: '14px',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '280px'
          },
          buttonAnimation: config.buttonAnimation || {
            enabled: false,
            type: 'pulse',
            duration: '1.5s'
          }
        }} 
      />
    </div>
  )
}

export default ChatWidget
