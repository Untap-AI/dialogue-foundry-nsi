import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter } from '@nlux/react'
import { useConfig } from '../../contexts/ConfigContext'
import '@nlux/themes/unstyled.css'
import './ChatInterface.css'

import { ChatApiService } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'
import type { ChatItem } from '@nlux/react'

export interface ChatInterfaceProps {
  onChatInitialized?: (chatId: string) => void
  className?: string
}

export const ChatInterface = ({
  onChatInitialized,
  className
}: ChatInterfaceProps) => {
  // Get config from context
  const { conversationStarters, chatConfig, theme, personaOptions } =
    useConfig()

  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatItem[] | undefined>(undefined)

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

        if (onChatInitialized) {
          onChatInitialized(chatInit.chatId)
        }
      } catch (error) {
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
  }, [onChatInitialized])

  // TODO: ConversationStarter UI
  // TODO: Loading State
  // TODO:
  return (
    <div className={`chat-interface-wrapper ${className || ''}`}>
      <div className="chat-interface-content">
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
            conversationStarters
          }}
          personaOptions={{
            assistant: personaOptions?.assistant
          }}
          composerOptions={{
            placeholder: 'Ask me anything...',
          }}
        />
      </div>
    </div>
  )
}
