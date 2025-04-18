import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter } from '@nlux/react'
import { useConfig } from '../../contexts/ConfigContext'
import '@nlux/themes/unstyled.css'
import './ChatInterface.css'

import { ChatApiService } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'
import { ErrorCategory, categorizeError } from '../../services/errors'
import type { ServiceError } from '../../services/errors'
import type { ChatItem, ErrorEventDetails } from '@nlux/react'

type ChatStatus = 'loading' | 'initialized' | 'error'

export interface ChatInterfaceProps {
  className?: string
  isOpen: boolean
}

export const ChatInterface = ({ className, isOpen }: ChatInterfaceProps) => {
  // Get config from context
  const {
    conversationStarters,
    chatConfig,
    theme = 'light',
    personaOptions
  } = useConfig()

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
      // On error - handle the error and pass to the observer
      error => {
        console.log('Error from streaming service:', error)
        // Pass the error to the observer for NLUX to handle
        observer.error(error)
      }
    )
  }, messages)

  useEffect(() => {
    return () => {
      streamingServiceRef.current?.cleanup()
    }
  }, [chatStatus])

  // Setup chat function
  const setupChat = async () => {
    try {
      setChatStatus('loading')
      // Initialize service
      const chatInit = await new ChatApiService(chatConfig).initializeChat()
      setChatId(chatInit.chatId)
      setMessages(chatInit.messages)
      setChatStatus('initialized')
    } catch (error) {
      setChatStatus('error')
      console.error('Chat initialization failed:', error)
    }
  }

  // Create a custom error handler for the NLUX error event
  const handleNluxError = (error: ErrorEventDetails) => {
    if (!error.errorObject) {
      return
    }

    const errorObject = error.errorObject as ServiceError

    // Find the error box element
    const errorBox = document.querySelector('.nlux-comp-exceptionBox')
    if (errorBox) {
      // Clear the existing content
      errorBox.innerHTML = ''

      // Process the error through our error handling system
      const category = categorizeError(errorObject.code)
      const message = error.errorObject.message

      // Create our custom error banner
      const errorBanner = document.createElement('div')
      errorBanner.className = `df-error-banner df-error-${category}`

      // Add the icon based on error category
      const iconMap: Record<ErrorCategory, string> = {
        [ErrorCategory.AUTHENTICATION]: '🔒',
        [ErrorCategory.CONNECTION]: '🔌',
        [ErrorCategory.SERVER]: '🖥️',
        [ErrorCategory.RATE_LIMIT]: '⏱️',
        [ErrorCategory.TIMEOUT]: '⌛',
        [ErrorCategory.UNKNOWN]: '⚠️'
      }

      // Build the error banner content
      errorBanner.innerHTML = `
        <div class="df-error-icon">${iconMap[category] || '⚠️'}</div>
        <div class="df-error-content">
          <div class="df-error-message">${message}</div>
        </div>
      `

      // Append our custom error banner
      errorBox.appendChild(errorBanner)

      setTimeout(() => {
        errorBox.innerHTML = ''
      }, 3000)
    }

    console.error('NLUX chat error:', error)
  }

  // Handle message sent event - creates ChatGPT-like scrolling
  const handleMessageSent = () => {
    // Find the conversation container
    const conversationContainer = document.querySelector(
      '.nlux-conversation-container'
    )
    const chatSegmentsContainer = document.querySelector(
      '.nlux-chatSegments-container'
    )

    if (
      conversationContainer &&
      conversationContainer instanceof HTMLElement &&
      chatSegmentsContainer &&
      chatSegmentsContainer instanceof HTMLElement
    ) {
      // Wait for the last message to be rendered
      setTimeout(() => {
        // Find the last sent message - use querySelectorAll and get the last one to ensure we get the most recent
        const sentMessages = document.querySelectorAll(
          '.nlux-comp-message.nlux_msg_sent'
        )
        const lastMessage =
          sentMessages.length > 0
            ? sentMessages[sentMessages.length - 1]
            : undefined

        if (lastMessage && lastMessage instanceof HTMLElement) {
          // Get the necessary measurements
          const chatSegmentsContainerRect =
            chatSegmentsContainer.getBoundingClientRect()
          const lastMessageRect = lastMessage.getBoundingClientRect()
          const conversationContainerHeight = conversationContainer.clientHeight

          // Calculate how far we need to scroll to position the last message at the top of the container
          // We add a small offset (70px) for better visual appearance
          const scrollOffset =
            conversationContainerHeight -
            (chatSegmentsContainerRect.bottom - lastMessageRect.bottom)
          // TODO: Calcuate small offset based on font size, etc.
          chatSegmentsContainer.style.minHeight = `${
            chatSegmentsContainer.scrollHeight + scrollOffset - 70
          }px`
        }
        // If for some reason we can't find the last message, fall back to scrolling to bottom
        conversationContainer.scrollTo({
          top: chatSegmentsContainer.scrollHeight,
          behavior: 'smooth'
        })
      }, 50)
    }
  }

  useEffect(() => {
    // Initialize chat on component mount
    setupChat()

    // Cleanup
    return () => {
      if (streamingServiceRef.current) {
        streamingServiceRef.current.cancelStream()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus input field when chat is initialized
  useEffect(() => {
    if (chatStatus === 'initialized' && isOpen) {
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
  }, [chatStatus, isOpen])

  // TODO: ConversationStarter UI
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
                    autoScroll: false
                  }}
                  personaOptions={{
                    assistant: personaOptions?.assistant
                  }}
                  composerOptions={{
                    placeholder: 'Ask me anything...',
                    autoFocus: true
                  }}
                  events={{
                    error: handleNluxError,
                    messageSent: handleMessageSent
                  }}
                />
              )
            case 'error':
              return (
                <div className="chat-error-container">
                  <p className="chat-error-text">Error loading chat.</p>
                  <p className="chat-error-text">Please try again.</p>
                  {/* <button 
                    className="chat-reload-button" 
                    onClick={retryConnection}
                  >
                    Reload Chat
                  </button> */}
                </div>
              )
          }
        })()}
      </div>
    </div>
  )
}
