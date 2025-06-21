import { useEffect, useMemo, useRef, useState } from 'react'
import { AiChat, useAiChatApi, useAsStreamAdapter } from '../../nlux'
import { useConfig } from '../../contexts/ConfigContext'
import '@nlux/themes/unstyled.css'
import './ChatInterface.css'
import { useResizeObserver } from '../../hooks/useResizeObserver'

import { ChatStreamingService } from '../../services/streaming'
import { ChatApiService } from '../../services/api'
import { ErrorCategory, categorizeError } from '../../services/errors'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import type { ServiceError } from '../../services/errors'
import type {
  AssistantPersona,
  ChatItem,
  ErrorEventDetails
} from '../../nlux'
import EmailInputChatItem from '../../nlux/core/src/sections/Conversation/EmailInputChatItem'

// Add the icon based on error category
const ERROR_ICON_MAP: Record<ErrorCategory, string> = {
  [ErrorCategory.AUTHENTICATION]: '🔒',
  [ErrorCategory.CONNECTION]: '🔌',
  [ErrorCategory.SERVER]: '🖥️',
  [ErrorCategory.RATE_LIMIT]: '⏱️',
  [ErrorCategory.TIMEOUT]: '⌛',
  [ErrorCategory.UNKNOWN]: '⚠️'
}

interface ChatInterfaceProps {
  className?: string | undefined
  chatId: string | undefined
  initialConversation: ChatItem[] | undefined
  chatStatus: ChatStatus
}

export const ChatInterface = ({
  className,
  chatId,
  initialConversation,
  chatStatus,
}: ChatInterfaceProps) => {
  // Get config from context
  const {
    conversationStarters,
    chatConfig,
    theme = 'light',
    personaOptions
  } = useConfig()

  // Add ref for the chat interface container
  const chatInterfaceRef = useRef<HTMLDivElement>(null)

  const streamingService = useMemo(
    () => new ChatStreamingService(chatConfig),
    [chatConfig]
  )

  // Create analytics service for tracking events
  const analyticsService = useMemo(
    () => new ChatApiService(chatConfig),
    [chatConfig]
  )

  const api = useAiChatApi()

  // Adapter with special event support
  const adapter = useAsStreamAdapter(
    (userMessage: string, observer) => {
      streamingService.streamMessage(
        userMessage,
        chunk => observer.next(chunk),
        () => observer.complete(),
        error => observer.error(error),
        chatConfig.companyId,
        event => {
          if (event.type === 'request_email') {
            api.conversation.createEmailInput()
          }
        }
      )
    },
    [chatConfig.companyId, streamingService]
  )

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

      // Build the error banner content
      errorBanner.innerHTML = `
        <div class="df-error-icon">${ERROR_ICON_MAP[category] || '⚠️'}</div>
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

  // Track if we've sent a message
  const messageSent = useRef(false)

  useEffect(() => {
    messageSent.current = false
  }, [chatId])

  // Handle message sent event - creates ChatGPT-like scrolling
  const handleMessageSent = () => {
    messageSent.current = true
    // Remove the conversation starters container
    const startersContainer = document.querySelectorAll(
      '.nlux-conversationStarters-container'
    )
    startersContainer.forEach(container => container.remove())

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

  // Handler for submitting email
  const handleEmailSubmitted = async (email: string) => {
    console.log('handleEmailSubmitted', email)
    if (!chatId) return
    // You can pass subject/conversationSummary as needed
    await analyticsService.sendEmailRequest(chatId, {
      userEmail: email,
      subject: '',
      conversationSummary: ''
    })
  }

  // Pass email input handlers and state to AiChat
  const aiChatProps = {
    api,
    adapter,
    key: chatId,
    displayOptions: {
      themeId: 'dialogue-foundry',
      colorScheme: theme
    },
    initialConversation,
    conversationOptions: {
      showWelcomeMessage: true,
      autoScroll: false,
      conversationStarters
    },
    messageOptions: {
      markdownLinkTarget: 'self' as 'self'
    },
    personaOptions: {
      assistant: personaOptions?.assistant as AssistantPersona
    },
    composerOptions: {
      placeholder: 'Ask me anything...',
      autoFocus: true
    },
    events: {
      error: handleNluxError,
      messageSent: handleMessageSent,
      emailSubmitted: handleEmailSubmitted
    },
  }
  // Set up link click tracking - only within the chat interface
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href) {
        // Find the message container that contains this link
        const messageContainer = link.closest('.nlux-comp-message')
        let messageId: string | undefined

        if (messageContainer) {
          messageId =
            messageContainer.getAttribute('data-message-id') ||
            messageContainer.id ||
            undefined
        }

        // Record analytics immediately without waiting - if the user is clicking links,
        // the chat should already be initialized
        analyticsService
          .recordAnalyticsEvent('link_click', {
            url: link.href,
            linkText: link.textContent || link.innerText || undefined,
            messageId
          })
          .catch(error => {
            console.warn('Analytics recording failed:', error)
          })
      }
    }

    // Add event listener only to the chat interface container
    const chatContainer = chatInterfaceRef.current
    if (chatContainer) {
      chatContainer.addEventListener('click', handleLinkClick)
    }

    // Cleanup
    return () => {
      if (chatContainer) {
        chatContainer.removeEventListener('click', handleLinkClick)
      }
    }
  }, [analyticsService])

  return (
    <div ref={chatInterfaceRef} className={`chat-interface-wrapper ${className}`}>
      <div className="chat-interface-content">
        {(() => {
          switch (chatStatus) {
            case 'uninitialized':
            case 'loading':
              return (
                <div className="chat-loader-container">
                  <div className="chat-spinner"></div>
                  <p className="chat-loading-text">Loading chat...</p>
                </div>
              )
            case 'initialized':
              return (
                <AiChat {...aiChatProps} />
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
      <div className="df-powered-by">
        Powered by{' '}
        <a
          href="https://untap-ai.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Untap AI
        </a>
      </div>
    </div>
  )
}
