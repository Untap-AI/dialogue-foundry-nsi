import { useState, useEffect, useMemo, useRef } from 'react'
import { AiChat, useAsStreamAdapter } from '@nlux/react'
import { useConfig } from '../../contexts/ConfigContext'
import '@nlux/themes/unstyled.css'
import './ChatInterface.css'

import { ChatApiService } from '../../services/api'
import { ChatStreamingService } from '../../services/streaming'
import { ErrorCategory, categorizeError } from '../../services/errors'
import type { ChatItem, ErrorEventDetails } from '@nlux/react'

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
        console.log('Error from streaming service:', error);
        // Pass the error to the observer for NLUX to handle
        observer.error(error);
      }
    )
  }, messages)

  // Setup chat function
  const setupChat = async () => {
    try {
      setChatStatus('loading');
      // Initialize service
      const chatInit = await new ChatApiService(chatConfig).initializeChat()
      setChatId(chatInit.chatId)
      setMessages(chatInit.messages)
      setChatStatus('initialized')
    } catch (error) {
      setChatStatus('error');
      console.error('Chat initialization failed:', error);
    }
  };

  // Manual retry functionality
  const retryConnection = () => {
    if (streamingServiceRef.current) {
      streamingServiceRef.current.resetReconnectionState();
    }
    setupChat();
  };

  // Create a custom error handler for the NLUX error event
  const handleNluxError = (error: ErrorEventDetails) => {
    if(!error.errorObject) {
      return
    }
    
    // Find the error box element
    const errorBox = document.querySelector('.nlux-comp-exceptionBox');
    if (errorBox) {
      // Clear the existing content
      errorBox.innerHTML = '';

      // Process the error through our error handling system
      const category = categorizeError(error.errorObject)
      const message = error.errorObject.message
      
      // Create our custom error banner
      const errorBanner = document.createElement('div');
      errorBanner.className = `df-error-banner df-error-${category}`;
      
      // Add the icon based on error category
      const iconMap: Record<ErrorCategory, string> = {
        [ErrorCategory.AUTHENTICATION]: '🔒',
        [ErrorCategory.CONNECTION]: '🔌',
        [ErrorCategory.SERVER]: '🖥️',
        [ErrorCategory.RATE_LIMIT]: '⏱️',
        [ErrorCategory.TIMEOUT]: '⌛',
        [ErrorCategory.UNKNOWN]: '⚠️'
      };
      
      // Build the error banner content
      errorBanner.innerHTML = `
        <div class="df-error-icon">${iconMap[category] || '⚠️'}</div>
        <div class="df-error-content">
          <div class="df-error-message">${message}</div>
        </div>
      `;
      
      // Append our custom error banner
      errorBox.appendChild(errorBanner);

      setTimeout(() => {
        errorBox.innerHTML = '';
      }, 3000);
    }
    
    console.error('NLUX chat error:', error);
  };

  useEffect(() => {
    // Initialize chat on component mount
    setupChat();

    // Cleanup
    return () => {
      if (streamingServiceRef.current) {
        streamingServiceRef.current.cancelStream()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
                    placeholder: 'Ask me anything...'
                  }}
                  events={{
                    error: handleNluxError
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

