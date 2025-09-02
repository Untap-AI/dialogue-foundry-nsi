import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatButton } from '../ChatButton/ChatButton'
import { ChatWindow } from '../ChatWindow/ChatWindow'
import { MobileChatModal } from '../MobileChatModal/MobileChatModal'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useConfig } from '../../contexts/ConfigContext'
import { useNavigationEvents } from '../../hooks/useNavigationEvents'
import { cn } from '@/lib/utils'
import type { ChatStatus } from '../../hooks/useChatPersistence'

const LOCAL_STORAGE_KEY = 'chatWidgetIsOpen'

export const ChatWidget = () => {
  const [chatStatus, setChatStatus] = useState<ChatStatus>('uninitialized')

  const { openOnLoad } = useConfig()

  // Use the resize observer hook with a 150ms debounce delay
  // Fast enough to feel responsive, but not too frequent to cause performance issues
  const { width } = useResizeObserver()
  // Determine if mobile based on current width
  const isMobile = width <= 768

  const [isOpen, setIsOpen] = useState(false)

  // On mount, set isOpen based on openOnLoad, isMobile, and localStorage
  useEffect(() => {
      let shouldOpen = false
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        switch (openOnLoad) {
          case 'all':
            shouldOpen = true
            break
          case 'desktop-only':
            shouldOpen = false
            break
          case 'mobile-only':
            shouldOpen = true
            break
          case 'none':
          case undefined:
            shouldOpen = false
            break
        }
      } else {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (stored === 'true') shouldOpen = true
        else if (stored === 'false') shouldOpen = false
        else {
          switch (openOnLoad) {
            case 'all':
              shouldOpen = true
              break
            case 'desktop-only':
              shouldOpen = true
              break
            case 'mobile-only':
              shouldOpen = false
              break
            case 'none':
            case undefined:
              shouldOpen = false
              break
          }
        }
      }
      setIsOpen(shouldOpen)
    // Only run on mount and when isMobile or openOnLoad changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOnLoad])

  // eslint-disable-next-line no-null/no-null
  const chatWindowRef = useRef<HTMLDivElement | null>(null)

  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      const newState = !prev

      localStorage.setItem(LOCAL_STORAGE_KEY, newState ? 'true' : 'false')

      return newState
    })
  }, [])

  useNavigationEvents(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setIsOpen(false)
    }
  })

  // Handle clicking outside to close chat (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click was on an element with data-chat-button attribute
      const target = event.target as HTMLElement
      const app = document.querySelector('#dialogue-foundry-app')

      if (
        chatWindowRef.current &&
        !app?.contains(target as Node) &&
        isOpen
      ) {
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

  // Handle chat status changes from ChatInterface
  const handleChatStatusChange = useCallback((status: ChatStatus) => {
    setChatStatus(status)
  }, [])

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    // Any additional logic needed when a new chat is created
    console.log('New chat created')
  }, [])

  return (
    <div className={cn(
      "fixed z-[9999] right-5 bottom-5",
      "[&_::-webkit-scrollbar-track]:bg-background [&_::-webkit-scrollbar-thumb]:bg-primary [&_::-webkit-scrollbar-thumb]:rounded",
      "[&_*]:scrollbar-thin [&_*]:scrollbar-track-background [&_*]:scrollbar-thumb-primary"
    )}>
      {/* Render either the desktop chat window or mobile modal based on screen size */}
      {isMobile ? (
        <MobileChatModal
          isOpen={isOpen}
          onClose={toggleChat}
          onNewChat={handleNewChat}
          onChatStatusChange={handleChatStatusChange}
        />
      ) : (
        <ChatWindow
          ref={chatWindowRef}
          isOpen={isOpen}
          onClose={toggleChat}
          onNewChat={handleNewChat}
          onChatStatusChange={handleChatStatusChange}
        />
      )}

      {/* Chat button */}
      <ChatButton onClick={toggleChat} isOpen={isOpen} />
    </div>
  )
}