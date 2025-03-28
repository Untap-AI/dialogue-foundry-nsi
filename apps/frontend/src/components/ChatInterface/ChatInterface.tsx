import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter, type ChatItem } from '@nlux/react'
import '@nlux/themes/unstyled.css'
import './css/main.css' // Import our custom theme CSS

import { ChatApiService, type ChatConfig } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'

type ColorScheme = 'light' | 'dark'

export interface ThemeProps {
  fontFamily?: string
  fontSize?: string
  backgroundColor?: string
  userMessageBgColor?: string
  userMessageTextColor?: string
  assistantMessageBgColor?: string
  assistantMessageTextColor?: string
  primaryButtonBgColor?: string
  primaryButtonTextColor?: string
  darkMode?: {
    backgroundColor?: string
    userMessageBgColor?: string
    userMessageTextColor?: string
    assistantMessageBgColor?: string
    assistantMessageTextColor?: string
    textColor?: string
  }
}

export interface ChatInterfaceProps {
  chatConfig?: ChatConfig
  initialMessages?: ChatItem[]
  height?: string | number
  width?: string | number
  onChatInitialized?: (chatId: string) => void
  className?: string
  theme?: ThemeProps
  colorScheme?: ColorScheme
}

export const ChatInterface = ({
  chatConfig = {},
  initialMessages = [],
  height = '100%',
  width = '100%',
  onChatInitialized,
  className,
  theme = {},
  colorScheme = 'light'
}: ChatInterfaceProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatItem[]>(initialMessages)

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
    console.log('ChatInterface useEffect')
    // Initialize chat on component mount
    const setupChat = async () => {
      try {
        setIsLoading(true)

        // For now, we're using a hardcoded chat config
        const chatInit = await new ChatApiService(chatConfig).initializeChat()
        setChatId(chatInit.chatId)
        setMessages(chatInit.messages)

        if (onChatInitialized) {
          onChatInitialized(chatInit.chatId)
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error)
      } finally {
        setIsLoading(false)
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

  return (
    <div
      style={{
        width,
        height
      }}
      className={`flex flex-col ${className}`}
    >
      <div className="flex-1 overflow-hidden">
        <AiChat
          adapter={adapter}
          key={chatId} // Add a key to force re-render when chatId changes
          initialConversation={initialMessages}
          displayOptions={{
            themeId: 'dialogue-foundry',
            colorScheme
          }}
        />
      </div>
    </div>
  )
}
