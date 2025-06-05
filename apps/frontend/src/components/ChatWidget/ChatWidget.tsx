import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChatButton } from '../ChatButton/ChatButton'
import { ChatWindow } from '../ChatWindow/ChatWindow'
import { MobileChatModal } from '../MobileChatModal/MobileChatModal'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import './ChatWidget.css'
import { useChatScroll } from '../../hooks/useChatScroll'
import { useConfig } from '../../contexts/ConfigContext'
import { ChatApiService } from '../../services/api'
import type { ChatItem } from '@nlux/react'

export type ChatStatus = 'uninitialized' | 'loading' | 'initialized' | 'error'

const LOCAL_STORAGE_KEY = 'chatWidgetIsOpen'

export const ChatWidget = () => {
  const [isClosing, setIsClosing] = useState(false)
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [initialConversation, setInitialConversation] = useState<
    ChatItem[] | undefined
  >(undefined)
  const [chatStatus, setChatStatus] = useState<ChatStatus>('uninitialized')

  const { chatConfig, welcomeMessage, openOnLoad } = useConfig()

  // Use the resize observer hook with a 150ms debounce delay
  // Fast enough to feel responsive, but not too frequent to cause performance issues
  const { width } = useResizeObserver()
  // Determine if mobile based on current width
  const isMobile = width <= 768

  const [isOpen, setIsOpen] = useState(false)

  // On mount, set isOpen based on openOnLoad, isMobile, and localStorage
  useEffect(() => {
      let shouldOpen = false
      if (isMobile) {
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
  }, [isMobile])

  // Handle clicking outside to close chat (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click was on an element with data-chat-button attribute
      const target = event.target as HTMLElement
      if (target.closest('[data-chat-button]')) return

      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
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

  useChatScroll({ isOpen })

  const chatService = useMemo(
    () => new ChatApiService(chatConfig),
    [chatConfig]
  )

  const setupChat = useCallback(async () => {
    setChatStatus('loading')

    try {
      // Initialize service
      const chatInit = await chatService.initializeChat(welcomeMessage)
      setChatId(chatInit.chatId)

      setInitialConversation(
        chatInit.messages.length > 0
          ? chatInit.messages
          : createWelcomeMessage(welcomeMessage)
      )
      setChatStatus('initialized')
    } catch (error) {
      setChatStatus('error')
      console.error('Chat initialization failed:', error)
    }
  }, [chatService, welcomeMessage])

  const createNewChat = useCallback(async () => {
    setChatStatus('loading')

    try {
      const chatInit = await chatService.createNewChat({
        sameUser: true
      })
      setChatId(chatInit.chatId)
      setInitialConversation(
        chatInit.messages.length > 0 ? chatInit.messages : undefined
      )
      setChatStatus('initialized')
    } catch (error) {
      setChatStatus('error')
      console.error('Chat initialization failed:', error)
    }
  }, [chatService])

  // Focus input field when chat is initialized
  useEffect(() => {
    if (chatStatus === 'initialized' && isOpen && !isMobile) {
      // Add a small delay to ensure the composer input is rendered
      setTimeout(() => {
        const inputField = document.querySelector(
          '.nlux-comp-composer > textarea'
        )

        if (inputField instanceof HTMLElement) {
          inputField.focus()
        }
      }, 300)
    }
  }, [chatStatus, isOpen, isMobile])

  useEffect(() => {
    if (isOpen && chatStatus === 'uninitialized' && chatConfig) {
      setupChat()
    }
  }, [isOpen, chatStatus, setupChat, chatConfig])

  return (
    <div className="chat-widget">
      {/* Render either the desktop chat window or mobile modal based on screen size */}
      {isMobile ? (
        <MobileChatModal
          isOpen={isOpen}
          onClose={toggleChat}
          onNewChat={createNewChat}
          chatId={chatId}
          initialConversation={initialConversation}
          chatStatus={chatStatus}
        />
      ) : (
        <ChatWindow
          ref={chatWindowRef}
          isOpen={isOpen}
          isClosing={isClosing}
          onClose={toggleChat}
          onNewChat={createNewChat}
          chatId={chatId}
          initialConversation={initialConversation}
          chatStatus={chatStatus}
        />
      )}

      {/* Chat button */}
      <ChatButton onClick={toggleChat} isOpen={isOpen} />
    </div>
  )
}

function createWelcomeMessage(welcomeMessage: string | undefined) {
  return welcomeMessage
    ? [
        {
          role: 'assistant' as const,
          message: welcomeMessage
        }
      ]
    : undefined
}
