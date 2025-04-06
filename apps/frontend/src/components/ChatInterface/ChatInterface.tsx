import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter } from '@nlux/react'
import { useConfig } from '../../contexts/ConfigContext'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import '@nlux/themes/unstyled.css'
import './ChatInterface.css'

import { ChatApiService } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'
import type { ChatItem } from '@nlux/react'

type ChatStatus = 'loading' | 'initialized' | 'error'

export interface ChatInterfaceProps {
  className?: string
}

export const ChatInterface = ({
  className
}: ChatInterfaceProps) => {
  // Get config from context
  const { conversationStarters, chatConfig, theme, personaOptions } =
    useConfig()

  // Use the resize observer hook with a 150ms debounce delay for consistent behavior with ChatWidget
  const { width } = useResizeObserver()
  // Determine if mobile based on current width
  const isMobile = width < 768

  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatItem[] | undefined>(undefined)
  const [chatStatus, setChatStatus] = useState<ChatStatus>('loading')
  // eslint-disable-next-line no-null/no-null
  const streamingServiceRef = useRef<ChatStreamingService | null>(null)

  const streamingService = useMemo(() => {
    const service = new ChatStreamingService(chatConfig)
    streamingServiceRef.current = service
    return service
  }, [chatConfig])

  // Create adapter at the top level
  const adapter = useAsStreamAdapter((userMessage: string, observer) => {
    // Call the streaming service with the message content
    streamingService.streamMessage(
      userMessage,
      // On each chunk update
      chunk => observer.next(chunk),
      // On complete
      () => observer.complete(),
      // On error
      error => observer.error(error)
    )
  }, messages)

  useEffect(() => {
    // Initialize chat on component mount
    const setupChat = async () => {
      try {
        // Initialize service
        const chatInit = await new ChatApiService(chatConfig).initializeChat()
        setChatId(chatInit.chatId)
        setMessages(chatInit.messages)
        setChatStatus('initialized')
      } catch (error) {
        setChatStatus('error')
        console.error('Failed to initialize chat:', error)
      }
    }

    setupChat()

    // Cleanup
    return () => {
      if (streamingServiceRef.current) {
        streamingServiceRef.current.cancelStream()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // TODO: ConversationStarter UI
  // TODO: Loading State
  // TODO:
  return (
    <div className={`chat-interface-wrapper ${className || ''}`}>
      <div className="chat-interface-content">
        {(() => {
          switch (chatStatus) {
            case 'loading':
              return (
                <div className="chat-loader-container">
                  <div className="chat-spinner"></div>
                  <p className="chat-loading-text">Loading chat...</p>
                </div>
              )
            case 'initialized':
              return (
                <AiChat
                  adapter={adapter}
                  key={chatId} // Add a key to force re-render when chatId changes
                  displayOptions={{
                    themeId: 'dialogue-foundry',
                    colorScheme: theme
                  }}
                  initialConversation={messages?.length ? messages : undefined}
                  conversationOptions={{
                    showWelcomeMessage: true,
                    conversationStarters,
                    autoScroll: !isMobile
                  }}
                  personaOptions={{
                    assistant: personaOptions?.assistant
                  }}
                  composerOptions={{
                    placeholder: 'Ask me anything...'
                  }}
                />
              )
            case 'error':
              return (
                <div className="chat-error-container">
                  <p className="chat-error-text">Error loading chat.</p>
                  <p className="chat-error-text">Please try again.</p>
                </div>
              )
          }
        })()}
      </div>
    </div>
  )
}
