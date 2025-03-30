import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatButton } from '../ChatButton/ChatButton'
import { ChatWindow } from '../ChatWindow/ChatWindow'
import './ChatWidget.css'

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <div className="chat-widget">
      {/* Chat window */}
      <ChatWindow
        ref={chatWindowRef}
        isOpen={isOpen}
        isClosing={isClosing}
        onClose={toggleChat}
      />

      {/* Chat button */}
      <ChatButton onClick={toggleChat} isOpen={isOpen} />
    </div>
  )
}

export default ChatWidget
