import { DEFAULT_TOKEN_STORAGE_KEY, DEFAULT_CHAT_ID_STORAGE_KEY } from './api'
import { StreamingError, ErrorCodes, isErrorCode } from './errors'
import { logger } from './logger'
import type { ErrorCodeValue } from './errors'
import type { ChatConfig } from './api'

interface StreamEvent {
  type: 'start' | 'chunk' | 'done' | 'error'
  content?: string
  fullContent?: string
  error?: string
  code?: string
  [key: string]: any // For special events
}

export class ChatStreamingService {
  private apiBaseUrl: string
  private companyId: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private abortController: AbortController | undefined = undefined
  private reconnectAttempts: number = 0
  private lastReconnectTime: number = 0
  private readonly MAX_RECONNECT_ATTEMPTS: number = 3
  private readonly RECONNECT_RESET_TIME: number = 10 * 60 * 1000 // 10 minutes

  constructor(config: ChatConfig) {
    this.apiBaseUrl = config.apiBaseUrl
    this.companyId = config.companyId
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey = config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = localStorage
  }

  /**
   * Initialize a new chat session
   */
  async initializeNewChat(): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Chat',
          companyId: this.companyId
        })
      })

      if (!response.ok) {
        throw new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true)
      }

      const data = await response.json()
      this.storage.setItem(this.tokenStorageKey, data.accessToken)
      this.storage.setItem(this.chatIdStorageKey, data.chat.id)
      return data.chat.id
    } catch (error) {
      logger.error('Failed to initialize new chat', { error })
      throw error instanceof StreamingError ? error : new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true)
    }
  }

  /**
   * Check if fetch streaming is supported
   */
  private isFetchStreamingSupported(): boolean {
    return typeof ReadableStream !== 'undefined' && 
           'getReader' in ReadableStream.prototype &&
           typeof TextDecoder !== 'undefined'
  }

  /**
   * Reset reconnection counters if sufficient time has passed
   */
  private checkAndResetReconnectCounters(): void {
    const now = Date.now()
    if (now - this.lastReconnectTime > this.RECONNECT_RESET_TIME) {
      this.reconnectAttempts = 0
    }
  }

  /**
   * Stream a message using fetch streaming (primary) or SSE (fallback)
   */
  async streamMessage(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    _companyId?: string,
    onSpecialEvent?: (event: any) => void
  ): Promise<void> {
    this.checkAndResetReconnectCounters()

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      const error = new StreamingError(ErrorCodes.RECONNECT_LIMIT, false)
      logger.captureException(error, { reconnectAttempts: this.reconnectAttempts })
      onError(error)
      return
    }

    let chatId = this.storage.getItem(this.chatIdStorageKey)
    let token = this.storage.getItem(this.tokenStorageKey)

    // Initialize chat if needed
    if (!chatId || !token) {
      try {
        await this.initializeNewChat()
        chatId = this.storage.getItem(this.chatIdStorageKey)
        token = this.storage.getItem(this.tokenStorageKey)
      } catch (initError) {
        onError(initError instanceof StreamingError ? initError : new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true))
        return
      }
    }

    if (!chatId || !token) {
      onError(new StreamingError(ErrorCodes.INITIALIZATION_ERROR, true))
      return
    }

    // Try fetch streaming first, fall back to SSE
    if (this.isFetchStreamingSupported()) {
      try {
        await this.fetchStream(chatId, token, userQuery, onChunk, onComplete, onError, onSpecialEvent)
        return
      } catch (fetchError) {
        logger.warning('Fetch streaming failed, falling back to SSE', { error: fetchError })
        // Continue to SSE fallback
      }
    }

    // SSE fallback
    await this.sseStream(chatId, token, userQuery, onChunk, onComplete, onError, onSpecialEvent)
  }

  /**
   * Primary streaming method using fetch + ReadableStream
   */
  private async fetchStream(
    chatId: string,
    token: string,
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onSpecialEvent?: (event: any) => void
  ): Promise<void> {
    this.abortController = new AbortController()
    
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      
      const response = await fetch(`${this.apiBaseUrl}/chats/${chatId}/stream-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: userQuery,
          timezone: userTimezone
        }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        if (response.status === 401) {
          await this.handleTokenError(userQuery, onChunk, onComplete, onError)
          return
        }
        throw new StreamingError(ErrorCodes.CONNECTION_ERROR, true)
      }

      if (!response.body) {
        throw new StreamingError(ErrorCodes.CONNECTION_ERROR, true)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event: StreamEvent = JSON.parse(line)
                await this.handleStreamEvent(event, onChunk, onComplete, onError, onSpecialEvent)
              } catch (parseError) {
                logger.warning('Failed to parse stream event', { line, error: parseError })
              }
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            const event: StreamEvent = JSON.parse(buffer)
            await this.handleStreamEvent(event, onChunk, onComplete, onError, onSpecialEvent)
          } catch (parseError) {
            logger.warning('Failed to parse final stream event', { buffer, error: parseError })
          }
        }

      } finally {
        reader.releaseLock()
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return // Intentional cancellation
      }
      
      logger.captureException(error, { chatId, method: 'fetch' })
      
      if (error instanceof StreamingError) {
        onError(error)
      } else {
        onError(new StreamingError(ErrorCodes.CONNECTION_ERROR, true))
      }
    }
  }

  /**
   * Fallback streaming method using SSE (simplified)
   */
  private async sseStream(
    chatId: string,
    token: string,
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onSpecialEvent?: (event: any) => void
  ): Promise<void> {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const url = new URL(`${this.apiBaseUrl}/chats/${chatId}/stream`)
    url.searchParams.append('content', userQuery)
    url.searchParams.append('timezone', userTimezone)
    url.searchParams.append('token', token)

    const eventSource = new EventSource(url.toString())

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleStreamEvent(data, onChunk, onComplete, onError, onSpecialEvent)
      } catch (parseError) {
        logger.warning('Failed to parse SSE event', { data: event.data, error: parseError })
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      if (eventSource.readyState === EventSource.CLOSED) {
        onComplete() // Graceful completion
      } else {
        onError(new StreamingError(ErrorCodes.CONNECTION_ERROR, true))
      }
    }
  }

  /**
   * Handle stream events from either fetch or SSE
   */
  private async handleStreamEvent(
    event: StreamEvent,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    onSpecialEvent?: (event: any) => void
  ): Promise<void> {
    switch (event.type) {
      case 'start':
        // Connection established
        break

      case 'chunk':
        if (typeof event.content === 'string') {
          onChunk(event.content)
        }
        break

      case 'done':
        onComplete()
        break

      case 'error':
        await this.handleServerError(event, onChunk, onComplete, onError)
        break

      default:
        // Special events (email detection, etc.)
        if (onSpecialEvent) {
          onSpecialEvent(event)
        }
        break
    }
  }

  /**
   * Handle server-side errors with retry logic
   */
  private async handleServerError(
    event: StreamEvent,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const errorCode = event.code && isErrorCode(event.code) ? event.code : ErrorCodes.UNKNOWN_ERROR

    switch (errorCode) {
      case ErrorCodes.TOKEN_EXPIRED:
      case ErrorCodes.TOKEN_INVALID:
      case ErrorCodes.TOKEN_MISSING:
        await this.handleTokenError(event.content || '', onChunk, onComplete, onError)
        break

      case ErrorCodes.NOT_FOUND:
      case ErrorCodes.INVALID_CHAT:
      case ErrorCodes.INVALID_COMPANY:
        await this.handleChatError(event.content || '', onChunk, onComplete, onError, errorCode)
        break

      default:
        const error = new StreamingError(errorCode, true)
        logger.captureException(error, { errorMessage: event.error })
        onError(error)
        break
    }
  }

  /**
   * Handle token errors with retry
   */
  private async handleTokenError(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      onError(new StreamingError(ErrorCodes.RECONNECT_LIMIT, false))
      return
    }

    try {
      // Clear tokens and reinitialize
      this.storage.removeItem(this.tokenStorageKey)
      this.storage.removeItem(this.chatIdStorageKey)
      
      await this.initializeNewChat()
      
      // Retry with exponential backoff
      const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, backoffTime))
      
      await this.streamMessage(userQuery, onChunk, onComplete, onError)
    } catch (error) {
      onError(new StreamingError(ErrorCodes.TOKEN_INVALID, false))
    }
  }

  /**
   * Handle chat-related errors
   */
  private async handleChatError(
    userQuery: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    errorCode: ErrorCodeValue
  ): Promise<void> {
    this.reconnectAttempts++
    this.lastReconnectTime = Date.now()

    const chatError = new StreamingError(errorCode, true)
    logger.captureException(chatError)
    onError(chatError)

    if (this.reconnectAttempts <= this.MAX_RECONNECT_ATTEMPTS) {
      try {
        this.storage.removeItem(this.tokenStorageKey)
        this.storage.removeItem(this.chatIdStorageKey)
        
        const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, backoffTime))
        
        await this.initializeNewChat()
        await this.streamMessage(userQuery, onChunk, onComplete, onError)
      } catch (error) {
        onError(new StreamingError(ErrorCodes.INITIALIZATION_ERROR, false))
      }
    }
  }

  /**
   * Cancel ongoing stream
   */
  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }
  }

  /**
   * Reset reconnection state
   */
  resetReconnectionState(): void {
    this.reconnectAttempts = 0
    this.lastReconnectTime = 0
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cancelStream()
    this.reconnectAttempts = 0
  }
}