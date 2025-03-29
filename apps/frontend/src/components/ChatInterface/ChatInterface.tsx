import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter, type ChatItem, AssistantPersona } from '@nlux/react'
import '@nlux/themes/unstyled.css'
import './css/main.css' // Import our custom theme CSS

import { ChatApiService, type ChatConfig } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'
import { useConfig } from '../../contexts/ConfigContext'

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
  chatConfig,
  initialMessages,
  height = '100%',
  width = '100%',
  onChatInitialized,
  className,
  colorScheme
}: ChatInterfaceProps) => {
  // Get config from context
  const { config } = useConfig()
  
  // Merge props with context config
  const mergedChatConfig = useMemo(() => ({
    ...(config || {}),
    ...(chatConfig || {})
  }), [config, chatConfig])
  
  const mergedInitialMessages = initialMessages || config.initialMessages || []
  const mergedColorScheme = colorScheme || config.theme?.colorScheme || 'light'
  
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatItem[]>(mergedInitialMessages)

  // eslint-disable-next-line no-null/no-null
  const streamingServiceRef = useRef<ChatStreamingService | null>(null)

  const streamingService = useMemo(() => {
    const service = new ChatStreamingService(mergedChatConfig)
    streamingServiceRef.current = service
    return service
  }, [mergedChatConfig])

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
        // Initialize service
        const chatInit = await new ChatApiService(mergedChatConfig).initializeChat()
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

  // Get persona from config and ensure it meets the AssistantPersona type requirements
  const persona: AssistantPersona = {
    name: config?.personaOptions?.assistant?.name || 'Wine Hills Expert',
    avatar: config?.personaOptions?.assistant?.avatar || 'https://i.pravatar.cc/300',
    tagline: config?.personaOptions?.assistant?.tagline || 'How may I assist you today?'
  }

  // TODO: ConversationStarter
  return (
    <div
      style={{
        width,
        height
      }}
      className={`chat-interface-wrapper ${className || ''}`}
    >
      <div className="chat-interface-content">
        <AiChat
          adapter={adapter}
          key={chatId} // Add a key to force re-render when chatId changes
          initialConversation={mergedInitialMessages.length > 0 ? mergedInitialMessages : undefined}
          displayOptions={{
            themeId: 'dialogue-foundry',
            colorScheme: mergedColorScheme
          }}
          conversationOptions={{
            showWelcomeMessage: true,
          }}
          personaOptions={{
            assistant: persona
          }}
        />
      </div>
    </div>
  )
}
