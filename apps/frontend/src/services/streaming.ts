import { DEFAULT_TOKEN_STORAGE_KEY, DEFAULT_CHAT_ID_STORAGE_KEY } from './api'
import { 
  StreamingError, 
  ErrorCodes, 
  isErrorCode, 
  ErrorCodeValue
} from './errors'
import type { ChatConfig } from './api'
import console from 'console'

// Define the SSE event types for TypeScript
interface SSEMessageEvent extends MessageEvent {
  data: string
}

interface SSEEventData {
  type: 'connected' | 'chunk' | 'done' | 'error' | 'err'
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
        throw new StreamingError(
          ErrorCodes.INITIALIZATION_ERROR,
          true
        )
      }

      const data = await response.json()

      // Store the new token and chat ID
      this.storage.setItem(this.tokenStorageKey, data.accessToken)
      this.storage.setItem(this.chatIdStorageKey, data.chat.id)

      return data.chat.id
    } catch (error) {
      if (error instanceof StreamingError) {
        throw error
      }

      throw new StreamingError(
        ErrorCodes.INITIALIZATION_ERROR,
        true
      )
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

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      onError(
        new StreamingError(
          ErrorCodes.RECONNECT_LIMIT,
          false
        )
      )
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
          onError(
            new StreamingError(
              ErrorCodes.INITIALIZATION_ERROR,
              false
            )
          )
          return
        }
      } catch (initError) {
        onError(
          new StreamingError(
            ErrorCodes.INITIALIZATION_ERROR,
            true
          )
        )
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
          // If token is invalid, try to reconnect
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
    } catch (error) {
      // Continue anyway, as this might just be a network error
    }

    // Close any existing EventSource
    this.cancelStream()

    // Create the URL with query parameters for token and content
    const url = new URL(`${this.apiBaseUrl}/chats/${chatId}/stream`)
    url.searchParams.append('content', userQuery)
    // Ensure token is not null before appending
    if (token) {
      url.searchParams.append('token', token)
    }

    try {
      // Create a new EventSource connection
      this.eventSource = new EventSource(url.toString())

      let fullText = ''
      let errorCount = 0
      const maxSilentErrors = 3 // Only log detailed errors for the first few occurrences

      // Reset error count when connection successfully opens
      this.eventSource.onopen = () => {
        errorCount = 0
      }

      // Handle incoming messages
      this.eventSource.onmessage = (event: SSEMessageEvent) => {
        // Reset error count on successful message reception
        errorCount = 0

        try {
          const data = JSON.parse(event.data) as SSEEventData

          // Check for any kind of error message from the server
          if (data.type === 'error') {
            this.handleServerError(userQuery, data, onChunk, onComplete, onError, companyId);
            return;
          }

          // If not an error, process normal message types
          switch (data.type) {
            case 'connected':
              break

            case 'chunk':
              // Handle the content - we've verified it's a string
              if (typeof data.content === 'string') {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                const content = data.content as string
                fullText += content
                onChunk(content)
              }
              break

            case 'done':
              // Mark that we're intentionally closing before invoking callbacks or cleanup
              this.isClosingConnection = true

              // Process the completion
              onComplete(
                typeof data.fullContent === 'string'
                  ? data.fullContent
                  : fullText
              )

              // Close the connection now that we're done
              this.closeEventSource()

              // Reset reconnect attempts on successful completion
              this.reconnectAttempts = 0
              break
          }
        } catch (parseError) {
          onError(
            new StreamingError(
              ErrorCodes.PARSE_ERROR,
              true
            )
          )
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
          console.warn(`EventSource error #${errorCount}`)
        }

        // Don't react to reconnection attempts
        if (this.eventSource?.readyState === 0) {
          // CONNECTING
          return
        }

        // Only notify user after multiple consecutive errors (actual connection problems)
        if (errorCount > 5) {
          onError(
            new StreamingError(
              ErrorCodes.CONNECTION_ERROR,
              true
            )
          )
        }
      }
    } catch (error) {
      onError(
        error instanceof StreamingError
          ? error
          : new StreamingError(
              ErrorCodes.CONNECTION_ERROR,
              true
            )
      )
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
    const errorCode = data.code && isErrorCode(data.code) 
      ? data.code 
      : ErrorCodes.UNKNOWN_ERROR;
    
    // Handle different error codes
    switch (errorCode) {
      // Authentication errors - need to renew session
      case ErrorCodes.TOKEN_INVALID:
      case ErrorCodes.TOKEN_MISSING:
        this.handleTokenError(userQuery, onChunk, onComplete, onError, companyId);
        break;
      
      // Chat errors - create a new chat session
      case ErrorCodes.NOT_FOUND:
      case ErrorCodes.INVALID_CHAT:
      case ErrorCodes.INVALID_COMPANY:
        this.handleChatError(
          userQuery,
          onChunk, 
          onComplete, 
          onError, 
          companyId,
          errorCode,
        );
        break;
      
      // Request errors - can't recover without user changing input
      case ErrorCodes.INVALID_REQUEST:
        onError(
          new StreamingError(
            errorCode,
            true // User can try again with a different message
          )
        );
        this.closeEventSource();
        break;
      
      // All other errors
      default:
        onError(
          new StreamingError(
            errorCode,
            true
          )
        );
        this.closeEventSource();
        break;
    }
  }

  /**
   * Calculate exponential backoff time based on retry attempts
   */
  private getBackoffTime(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000) // Max 10 seconds
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
      onError(
        new StreamingError(
          ErrorCodes.TOKEN_INVALID,
          false
        )
      )
      this.isReconnecting = false
      return
    }

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      onError(
        new StreamingError(
          ErrorCodes.RECONNECT_LIMIT,
          false
        )
      )
      this.isReconnecting = false
      return
    }

    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      onError(
        new StreamingError(
          ErrorCodes.TOKEN_INVALID,
          false
        )
      )
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
      await this.streamMessage(userQuery, onChunk, onComplete, onError, companyId)
      this.isReconnecting = false
    } catch (error) {
      onError(
        new StreamingError(
          ErrorCodes.TOKEN_INVALID,
          false
        )
      )
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
    errorCode: ErrorCodeValue = ErrorCodes.CONFIGURATION_ERROR,
  ): Promise<void> {
    this.closeEventSource()

    // Track reconnection attempt
    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    // Notify the user of the issue
    onError(
      new StreamingError(
        errorCode,
        true // These errors are recoverable
      )
    )

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      onError(
        new StreamingError(
          ErrorCodes.RECONNECT_LIMIT,
          false
        )
      )
      this.isReconnecting = false
      return
    }

    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      onError(
        new StreamingError(
          errorCode,
          false
        )
      )
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
      await this.streamMessage(userQuery, onChunk, onComplete, onError, companyId)
      this.isReconnecting = false
    } catch (error) {
      onError(
        new StreamingError(
          ErrorCodes.INITIALIZATION_ERROR,
          false
        )
      )
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
    this.isClosingConnection = true
    this.closeEventSource()
  }

  /**
   * Reset reconnection state and counters
   * Call this when the user manually reloads or takes action to resolve issues
   */
  resetReconnectionState(): void {
    this.reconnectAttempts = 0
    this.tokenReconnectAttempts = 0 // Also reset token reconnect attempts
    this.lastReconnectTime = 0
    this.isReconnecting = false
  }
}
