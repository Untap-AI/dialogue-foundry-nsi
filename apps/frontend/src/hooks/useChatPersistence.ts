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

  const { chatConfig, welcomeMessage } = useConfig()
  const {apiBaseUrl} = chatConfig

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
      }
    })
  }, [apiBaseUrl, chatService])

  // Initialize useChat hook with dynamic transport
  const chat = useChat({
    ...(savedChat && { chat: savedChat }),
    transport,
    onError: (error) => {
      logger.error('Chat error:', { error: error.message })
      setChatStatus('error')
    },
  })

  // Initialize chat session
  const initializeChat = useCallback(async () => {
    if (chatStatus !== 'uninitialized') return

    setChatStatus('loading')
    
    try {
      const chatInit = await chatService.initializeChat(welcomeMessage)
      
      setSavedChat(new Chat({
        transport: new DefaultChatTransport({
          api: `${apiBaseUrl}/chats/stream-ai-sdk`,
          headers: () => {
            const token = chatService.getCurrentToken()
            const headers: Record<string, string> = {}
            if (token) {
              headers['Authorization'] = `Bearer ${token}`
            }
            return headers
          }
        }),
        id: chatInit.chatId,
        messages: chatInit.messages,
        onError: (error) => {
      logger.error('Chat error:', { error: error.message })
      setChatStatus('error')
    },
      }))
      setChatStatus('initialized')
    } catch (error) {
      logger.error('Error loading existing chat:', error)
      setChatStatus('error')
    }
  }, [chatService, welcomeMessage, chatConfig.apiBaseUrl, chatStatus, savedChat])

  // Auto-initialize when hook is first used
  useLayoutEffect(() => {
    if (chatStatus === 'uninitialized' && chatConfig) {
      initializeChat()
    }
  }, [chatStatus, chatConfig, initializeChat])

  return {
    // Chat state
    chatStatus,
    
    // Chat methods
    initializeChat,
    
    // AI SDK chat hook
    ...chat
  }
}
