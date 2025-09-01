import { useState, useLayoutEffect, useCallback, useMemo, useEffect } from 'react'
import { Chat, useChat } from '@ai-sdk/react'
import { ChatApiService } from '../services/api'
import { logger } from '../services/logger'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useConfig } from '../contexts/ConfigContext'

export type ChatStatus = 'uninitialized' | 'loading' | 'initialized' | 'error'

export function useChatPersistence() {
  const [chatStatus, setChatStatus] = useState<ChatStatus>('uninitialized')
  const [savedChat, setSavedChat] = useState<Chat<UIMessage> | undefined>(undefined)
  const [streamError, setStreamError] = useState<string | null>(null)


  const { chatConfig, welcomeMessage } = useConfig()
  const {apiBaseUrl} = chatConfig

  // Get user's timezone
  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch (error) {
      logger.warning('Failed to detect user timezone, falling back to UTC', { error })
      return 'UTC'
    }
  }, [])

  const chatService = useMemo(
    () => new ChatApiService(chatConfig),
    [chatConfig]
  )

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `${apiBaseUrl}/chats/stream-ai-sdk`,
      headers: () => {
        const token = chatService.getCurrentToken()
        const headers: Record<string, string> = {}
  
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        return headers
      },
      prepareSendMessagesRequest: ({ id, messages, body, ...rest }) => {
        return {
          ...rest,
          body: {
            ...body,
            id,
            messages,
            timezone: userTimezone,
          },
        }
      }
    })
  }, [apiBaseUrl, chatService, userTimezone])

  // Initialize useChat hook with dynamic transport
  const chat = useChat({
    ...(savedChat && { chat: savedChat }),
    transport,
    onError: (error) => {
      logger.error('Chat stream error:', { error: error.message })
      setStreamError(error.message)

      setTimeout(() => {
        setStreamError(null)
      }, 8000)
    }
  })

  // Initialize chat session
  const initializeChat = useCallback(async () => {
    if (chatStatus !== 'uninitialized') return

    setChatStatus('loading')
    
    try {
      const chatInit = await chatService.initializeChat(welcomeMessage)
      
      setSavedChat(new Chat({
        transport,
        id: chatInit.chatId,
        messages: chatInit.messages,
        onError: (error) => {
          logger.error('Chat stream error:', { error: error.message })
          setStreamError(error.message)

          setTimeout(() => {
            setStreamError(null)
          }, 8000)
        },
      }))
      setChatStatus('initialized')
    } catch (error) {
      logger.error('Error loading existing chat:', error)
      setChatStatus('error')
    }
  }, [chatService, welcomeMessage, transport, chatStatus])

  // Auto-initialize when hook is first used
  useLayoutEffect(() => {
    if (chatStatus === 'uninitialized' && chatConfig) {
      initializeChat()
    }
  }, [chatStatus, chatConfig, initializeChat])

  // Clear stream error when a new message starts  
  useEffect(() => {
    if (chat.status === 'submitted' && streamError) {
      setStreamError(null)
    }
  }, [chat.status, streamError])

  // Function to submit email for tool call
  const submitEmailForToolCall = useCallback(async (
    userEmail: string,
    toolCallId: string,
    subject: string,
    conversationSummary: string
  ) => {
    if (!savedChat) {
      throw new Error('No chat session available')
    }

    try {
      const result = await chatService.sendEmailRequest(savedChat.id, {
        userEmail,
        subject,
        conversationSummary
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit email')
      }
      
      // Add tool result to the chat
      (chat as any).addToolResult({
        toolCallId,
        result: 'Email sent successfully! We\'ll get back to you soon.'
      })
      
      return result
    } catch (error) {
      logger.error('Error submitting email for tool call:', error)
      throw error
    }
  }, [savedChat, chatService, chat])

  // Analytics methods
  const recordLinkClick = useCallback(async (
    url: string,
    linkText?: string,
    messageId?: string
  ) => {
    await chatService.recordLinkClick(url, linkText, messageId)
  }, [chatService])

  const recordConversationStarterClick = useCallback(async (
    label: string | undefined,
    position: number,
    prompt?: string
  ) => {
    await chatService.recordConversationStarterClick(label, position, prompt)
  }, [chatService])

  return {
    // Chat state
    chatStatus,
    streamError,
    
    // Chat methods
    initializeChat,
    clearStreamError: () => setStreamError(null),
    submitEmailForToolCall,
    
    // Analytics methods
    recordLinkClick,
    recordConversationStarterClick,
    
    // AI SDK chat hook
    ...chat
  }
}
