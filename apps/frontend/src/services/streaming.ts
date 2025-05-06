import { DEFAULT_TOKEN_STORAGE_KEY, DEFAULT_CHAT_ID_STORAGE_KEY } from './api'
import { StreamingError, ErrorCodes, isErrorCode } from './errors'
import { logger } from './logger'
import type { ErrorCodeValue } from './errors'
import type { ChatConfig } from './api'

// Define the SSE event types for TypeScript
interface SSEMessageEvent extends MessageEvent {
  data: string
}

interface SSEEventData {
  type: 'connected' | 'chunk' | 'done' | 'error'
  content?: string
  fullContent?: string
  error?: string
  code?: string
}

export class ChatStreamingService {
  private apiBaseUrl: string
  private companyId: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private eventSource: EventSource | undefined = undefined
  private isReconnecting: boolean = false
  private reconnectAttempts: number = 0
  private lastReconnectTime: number = 0
  private tokenReconnectAttempts: number = 0 // Add counter specifically for token errors
  private readonly MAX_RECONNECT_ATTEMPTS: number = 3
  private readonly MAX_TOKEN_RECONNECT_ATTEMPTS: number = 1 // Limit token reconnection to 1 attempt
  private readonly RECONNECT_RESET_TIME: number = 10 * 60 * 1000 // 10 minutes in ms
  private isClosingConnection: boolean = false

  constructor(config: ChatConfig) {
    this.apiBaseUrl = config.apiBaseUrl
    this.companyId = config.companyId
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = localStorage
  }

  /**
   * Initialize a new chat session
   * @returns Promise resolving to the new chat ID
   */
  async initializeNewChat(): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'New Chat',
          companyId: this.companyId
        })
      })

      if (!response.ok) {
        const error = new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true)

        logger.captureException(error, {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        })

        throw error
      }

      const data = await response.json()

      // Store the new token and chat ID
      this.storage.setItem(this.tokenStorageKey, data.accessToken)
      this.storage.setItem(this.chatIdStorageKey, data.chat.id)

      return data.chat.id
    } catch (error) {
      logger.error('Failed to initialize new chat', { error })

      if (error instanceof StreamingError) {
        throw error
      }

      const initError = new StreamingError(
        ErrorCodes.INITIALIZATION_ERROR,
        true
      )

      logger.captureException(initError, {
        originalError: error
      })

      throw initError
    }
  }

  /**
   * Reset reconnection counters if sufficient time has passed
   */
  private checkAndResetReconnectCounters(): void {
    const now = Date.now()
    // If it's been more than the reset time since the last reconnect attempt, reset counters
    if (now - this.lastReconnectTime > this.RECONNECT_RESET_TIME) {
      this.reconnectAttempts = 0
      this.tokenReconnectAttempts = 0 // Also reset token reconnect attempts

      logger.debug('Reset reconnection counters due to elapsed time')
    }
  }

  /**
   * Stream a message to the chat using SSE (Server-Sent Events)
   * @param content User message content
   * @param onChunk Callback for each message chunk
   * @param onComplete Callback for when the stream completes
   * @param onError Callback for when an error occurs
   * @param companyId Optional company ID for initializing a new chat if needed
   */
  async streamMessage(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): Promise<void> {
    // Reset reconnection counters if it's been a while
    this.checkAndResetReconnectCounters()

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      const reconnectError = new StreamingError(
        ErrorCodes.RECONNECT_LIMIT,
        false
      )

      logger.captureException(reconnectError, {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS
      })

      onError(reconnectError)
      return
    }

    let chatId = this.storage.getItem(this.chatIdStorageKey)
    let token = this.storage.getItem(this.tokenStorageKey)

    // If we're missing the chat ID or token, try to initialize a new chat
    if (!chatId || !token) {
      try {
        if (!this.isReconnecting) {
          await this.initializeNewChat()
          chatId = this.storage.getItem(this.chatIdStorageKey)
          token = this.storage.getItem(this.tokenStorageKey)
        } else {
          // We're already trying to reconnect but still no token/chatId
          const initError = new StreamingError(
            ErrorCodes.INITIALIZATION_ERROR,
            false
          )

          logger.captureException(initError, {
            isReconnecting: this.isReconnecting,
            chatId: !!chatId,
            token: !!token
          })

          onError(initError)
          return
        }
      } catch (initError) {
        const error = new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true)

        logger.captureException(error, {
          originalError: initError
        })

        onError(error)
        return
      }
    }

    // Check token validity before proceeding
    try {
      const testResponse = await fetch(`${this.apiBaseUrl}/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!testResponse.ok) {
        if (testResponse.status === 401) {
          // Try to get the error code from the response
          try {
            const errorData = await testResponse.json()
            const errorCode = errorData.code

            // Handle differently based on error code
            if (errorCode === ErrorCodes.TOKEN_EXPIRED) {
              // For expired tokens, silently reconnect without logging
              this.handleTokenExpired(
                userQuery,
                onChunk,
                onComplete,
                onError,
                companyId
              )
              return
            } else {
              // For other auth errors, use regular token error handling
              logger.warning('Token is invalid, attempting to reconnect', {
                status: testResponse.status,
                chatId,
                errorCode
              })
              this.handleTokenError(
                userQuery,
                onChunk,
                onComplete,
                onError,
                companyId
              )
              return
            }
          } catch (parseError) {
            // If can't parse JSON, treat as generic token error
            logger.warning('Token error, attempting to reconnect', {
              status: testResponse.status,
              chatId
            })
            this.handleTokenError(
              userQuery,
              onChunk,
              onComplete,
              onError,
              companyId
            )
            return
          }
        }
      }
    } catch (error) {
      // Log the error but continue anyway, as this might just be a network error
      logger.info('Error checking token validity, continuing anyway', {
        error
      })
    }

    // Close any existing EventSource
    this.cancelStream()

    // Create the URL with query parameters for token and content
    const url = new URL(`${this.apiBaseUrl}/chats/${chatId}/stream`)
    url.searchParams.append('content', userQuery)
    url.searchParams.append('timezone', userTimezone)
    // Ensure token is not null before appending
    if (token) {
      url.searchParams.append('token', token)
    }

    try {
      logger.debug('Establishing SSE connection', { chatId })

      // Create a new EventSource connection
      this.eventSource = new EventSource(url.toString())

      let fullText = ''
      let errorCount = 0
      const maxSilentErrors = 3 // Only log detailed errors for the first few occurrences

      // Reset error count when connection successfully opens
      this.eventSource.onopen = () => {
        errorCount = 0
        logger.debug('SSE connection opened successfully')
      }

      // Handle incoming messages
      this.eventSource.onmessage = (event: SSEMessageEvent) => {
        // Reset error count on successful message reception
        errorCount = 0

        try {
          const data = JSON.parse(event.data) as SSEEventData

          // Check for any kind of error message from the server
          if (data.type === 'error') {
            logger.warning('Received error in SSE message', {
              errorMessage: data.error,
              errorCode: data.code
            })

            this.handleServerError(
              userQuery,
              data,
              onChunk,
              onComplete,
              onError,
              companyId
            )
            return
          }

          // If not an error, process normal message types
          switch (data.type) {
            case 'connected':
              logger.debug('SSE connected message received')
              break

            case 'chunk':
              // Handle the content - we've verified it's a string
              if (typeof data.content === 'string') {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const content = data.content as string
                fullText += content

                if (this.eventSource?.readyState === 2) {
                  logger.warning('SSE connection closed before message was processed')
                }

                onChunk(content)
              }
              break

            case 'done': {
              // Mark that we're intentionally closing before invoking callbacks or cleanup
              this.isClosingConnection = true

              // Ensure we have the complete response by preferring the fullContent
              // provided by the server, which is guaranteed to be complete
              const completeResponse =
                typeof data.fullContent === 'string'
                  ? data.fullContent
                  : fullText

              // Add a longer delay before completing to ensure any pending chunks are processed
              // Increased from 100ms to 1000ms (1 second) for more reliable completion
              setTimeout(() => {
                if (!this.isClosingConnection) {
                  // If connection was manually closed during this timeout, don't proceed
                  return;
                }

                // Process the completion
                onComplete(completeResponse)

                // Close the connection now that we're done
                this.closeEventSource()

                // Reset reconnect attempts on successful completion
                this.reconnectAttempts = 0
              }, 1000)
              break
            }
          }
        } catch (error) {
          const streamError =
            error instanceof StreamingError
              ? error
              : new StreamingError(ErrorCodes.CONNECTION_ERROR, true)

          logger.captureException(streamError, {
            originalError: error,
            chatId
          })

          onError(streamError)
          this.closeEventSource()
        }
      }

      // Implement error handler that distinguishes between expected and unexpected errors
      this.eventSource.onerror = () => {
        // Track if we're in the process of closing
        const isClosing =
          !this.eventSource ||
          this.eventSource.readyState === 2 || // CLOSED
          this.isClosingConnection

        errorCount++

        // If we're closing the connection, ignore the error as it's expected
        if (isClosing) {
          return
        }

        // Log only the first few errors to avoid console spam
        if (errorCount <= maxSilentErrors) {
          logger.warning(`EventSource error #${errorCount}`, {
            readyState: this.eventSource?.readyState
          })
        }

        // Don't react to reconnection attempts
        if (this.eventSource?.readyState === 0) {
          // CONNECTING
          return
        }

        // Only notify user after multiple consecutive errors (actual connection problems)
        if (errorCount > 5) {
          const connectionError = new StreamingError(
            ErrorCodes.CONNECTION_ERROR,
            true
          )

          logger.captureException(connectionError, {
            errorCount,
            readyState: this.eventSource?.readyState
          })

          onError(connectionError)
        }
      }
    } catch (error) {
      const streamError =
        error instanceof StreamingError
          ? error
          : new StreamingError(ErrorCodes.CONNECTION_ERROR, true)

      logger.captureException(streamError, {
        originalError: error,
        chatId
      })

      onError(streamError)
      this.closeEventSource()
    }
  }

  /**
   * Process server-side error messages and take appropriate action
   */
  private handleServerError(
    userQuery: string,
    data: SSEEventData,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): void {
    // Validate the error code and set a default if invalid
    const errorCode =
      data.code && isErrorCode(data.code) ? data.code : ErrorCodes.UNKNOWN_ERROR

    // Handle different error codes
    switch (errorCode) {
      // Token expired (handled differently from invalid)
      case ErrorCodes.TOKEN_EXPIRED:
        this.handleTokenExpired(
          userQuery,
          onChunk,
          onComplete,
          onError,
          companyId
        )
        break

      // Other authentication errors - need to renew session and log the issue
      case ErrorCodes.TOKEN_INVALID:
      case ErrorCodes.TOKEN_MISSING:
        logger.warning('Handling server error', {
          errorCode,
          errorMessage: data.error
        })
        this.handleTokenError(
          userQuery,
          onChunk,
          onComplete,
          onError,
          companyId
        )
        break

      // Chat errors - create a new chat session
      case ErrorCodes.NOT_FOUND:
      case ErrorCodes.INVALID_CHAT:
      case ErrorCodes.INVALID_COMPANY:
        logger.warning('Handling server error', {
          errorCode,
          errorMessage: data.error
        })
        this.handleChatError(
          userQuery,
          onChunk,
          onComplete,
          onError,
          companyId,
          errorCode
        )
        break

      // Request errors - can't recover without user changing input
      case ErrorCodes.INVALID_REQUEST:
        // eslint-disable-next-line no-case-declarations
        const requestError = new StreamingError(
          errorCode,
          true // User can try again with a different message
        )

        logger.captureException(requestError, {
          errorMessage: data.error
        })

        onError(requestError)
        this.closeEventSource()
        break

      // All other errors
      default:
        // eslint-disable-next-line no-case-declarations
        const genericError = new StreamingError(errorCode, true)

        logger.captureException(genericError, {
          errorMessage: data.error
        })

        onError(genericError)
        this.closeEventSource()
        break
    }
  }

  /**
   * Calculate exponential backoff time based on retry attempts
   */
  private getBackoffTime(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000) // Max 10 seconds
  }

  /**
   * Handle token expiration by silently reinitializing the chat and retrying
   * Similar to handleTokenError but without logging warnings
   */
  private async handleTokenExpired(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): Promise<void> {
    this.closeEventSource()

    // Track reconnection attempt but do not increment tokenReconnectAttempts
    // as we treat expiration differently from invalid tokens
    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      const reconnectError = new StreamingError(
        ErrorCodes.RECONNECT_LIMIT,
        false
      )

      logger.captureException(reconnectError, {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS
      })

      onError(reconnectError)
      this.isReconnecting = false
      return
    }

    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      const nestingError = new StreamingError(ErrorCodes.TOKEN_EXPIRED, false)

      logger.captureException(nestingError, {
        message: 'Nested reconnection attempt prevented'
      })

      onError(nestingError)
      this.isReconnecting = false
      return
    }

    this.isReconnecting = true

    try {
      // For expired tokens, we don't need to wait for backoff time
      // as expiration is expected, not an error condition

      // Clear existing token and chat ID
      this.storage.removeItem(this.tokenStorageKey)
      this.storage.removeItem(this.chatIdStorageKey)

      // Initialize a new chat
      await this.initializeNewChat()

      // Retry the streaming request
      await this.streamMessage(
        userQuery,
        onChunk,
        onComplete,
        onError,
        companyId
      )
      this.isReconnecting = false
    } catch (error) {
      const retryError = new StreamingError(ErrorCodes.TOKEN_EXPIRED, false)

      logger.captureException(retryError, {
        originalError: error
      })

      onError(retryError)
      this.isReconnecting = false
    }
  }

  /**
   * Handle token errors by reinitializing the chat and retrying
   */
  private async handleTokenError(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): Promise<void> {
    this.closeEventSource()

    // Track reconnection attempt
    this.reconnectAttempts++
    this.tokenReconnectAttempts++
    this.lastReconnectTime = Date.now()

    // Check if we've exceeded maximum token reconnection attempts (limit to 1)
    if (this.tokenReconnectAttempts > this.MAX_TOKEN_RECONNECT_ATTEMPTS) {
      const tokenError = new StreamingError(ErrorCodes.TOKEN_INVALID, false)

      logger.captureException(tokenError, {
        tokenReconnectAttempts: this.tokenReconnectAttempts,
        maxTokenReconnectAttempts: this.MAX_TOKEN_RECONNECT_ATTEMPTS
      })

      onError(tokenError)
      this.isReconnecting = false
      return
    }

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      const reconnectError = new StreamingError(
        ErrorCodes.RECONNECT_LIMIT,
        false
      )

      logger.captureException(reconnectError, {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS
      })

      onError(reconnectError)
      this.isReconnecting = false
      return
    }

    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      const nestingError = new StreamingError(ErrorCodes.TOKEN_INVALID, false)

      logger.captureException(nestingError, {
        message: 'Nested reconnection attempt prevented'
      })

      onError(nestingError)
      this.isReconnecting = false
      return
    }

    this.isReconnecting = true

    try {
      // Calculate backoff time for exponential retry
      const backoffTime = this.getBackoffTime()

      // Wait for backoff time before retrying
      await new Promise(resolve => setTimeout(resolve, backoffTime))

      // Clear existing token and chat ID
      this.storage.removeItem(this.tokenStorageKey)
      this.storage.removeItem(this.chatIdStorageKey)

      // Initialize a new chat
      await this.initializeNewChat()

      // Retry the streaming request
      await this.streamMessage(
        userQuery,
        onChunk,
        onComplete,
        onError,
        companyId
      )
      this.isReconnecting = false
    } catch (error) {
      const retryError = new StreamingError(ErrorCodes.TOKEN_INVALID, false)

      logger.captureException(retryError, {
        originalError: error
      })

      onError(retryError)
      this.isReconnecting = false
    }
  }

  /**
   * Handle chat-related errors by reinitializing the chat and retrying
   * Used for NOT_FOUND, INVALID_CHAT, and INVALID_COMPANY errors
   */
  private async handleChatError(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string,
    errorCode: ErrorCodeValue = ErrorCodes.CONFIGURATION_ERROR
  ): Promise<void> {
    this.closeEventSource()

    // Track reconnection attempt
    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    // Notify the user of the issue
    const chatError = new StreamingError(
      errorCode,
      true // These errors are recoverable
    )

    logger.captureException(chatError)
    onError(chatError)

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      const reconnectError = new StreamingError(
        ErrorCodes.RECONNECT_LIMIT,
        false
      )

      logger.captureException(reconnectError, {
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.MAX_RECONNECT_ATTEMPTS
      })

      onError(reconnectError)
      this.isReconnecting = false
      return
    }

    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      const nestingError = new StreamingError(errorCode, false)

      logger.captureException(nestingError, {
        message: 'Nested reconnection attempt prevented',
        errorCode
      })

      onError(nestingError)
      this.isReconnecting = false
      return
    }

    this.isReconnecting = true

    try {
      // Calculate backoff time for exponential retry
      const backoffTime = this.getBackoffTime()

      // Wait for backoff time before retrying
      await new Promise(resolve => setTimeout(resolve, backoffTime))

      // Clear existing token and chat ID
      this.storage.removeItem(this.tokenStorageKey)
      this.storage.removeItem(this.chatIdStorageKey)

      // Initialize a new chat
      await this.initializeNewChat()

      // Retry the streaming request
      await this.streamMessage(
        userQuery,
        onChunk,
        onComplete,
        onError,
        companyId
      )
      this.isReconnecting = false
    } catch (error) {
      const initError = new StreamingError(
        ErrorCodes.INITIALIZATION_ERROR,
        false
      )

      logger.captureException(initError, {
        originalError: error
      })

      onError(initError)
      this.isReconnecting = false
    }
  }

  /**
   * Close the EventSource connection
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      // Set flag before any operations that might trigger events
      this.isClosingConnection = true

      // Remove all event listeners before closing
      // eslint-disable-next-line no-null/no-null
      this.eventSource.onmessage = null
      // eslint-disable-next-line no-null/no-null
      this.eventSource.onerror = null
      // eslint-disable-next-line no-null/no-null
      this.eventSource.onopen = null

      // Close the connection
      this.eventSource.close()
      this.eventSource = undefined
    }
  }

  /**
   * Cancel ongoing stream if one exists
   */
  cancelStream(): void {
    logger.debug('Cancelling active stream')
    this.isClosingConnection = true
    this.closeEventSource()
  }

  /**
   * Reset reconnection state and counters
   * Call this when the user manually reloads or takes action to resolve issues
   */
  resetReconnectionState(): void {
    ('Resetting reconnection state')

    this.reconnectAttempts = 0
    this.tokenReconnectAttempts = 0 // Also reset token reconnect attempts
    this.lastReconnectTime = 0
    this.isReconnecting = false
  }

  /**
   * Clean up all connections and prevent reconnects
   * Call this when the component unmounts or the user navigates away
   */
  cleanup(): void {
    this.isClosingConnection = true
    this.closeEventSource()
    this.reconnectAttempts = 0
  }
}
