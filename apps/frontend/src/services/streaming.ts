import {
  DEFAULT_API_BASE_URL,
  DEFAULT_TOKEN_STORAGE_KEY,
  DEFAULT_CHAT_ID_STORAGE_KEY
} from './api'

export interface StreamingConfig {
  apiBaseUrl?: string
  tokenStorageKey?: string
  chatIdStorageKey?: string
  storage?: Storage
}

export class ChatStreamingService {
  private apiBaseUrl: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private abortController: AbortController | undefined = undefined

  constructor(config: StreamingConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = config.storage || localStorage
  }

  /**
   * Stream a message to the chat using SSE (Server-Sent Events)
   * @param content User message content
   * @param onChunk Callback for each message chunk
   * @param onComplete Callback for when the stream completes
   * @param onError Callback for when an error occurs
   */
  async streamMessage(
    content: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const chatId = this.storage.getItem(this.chatIdStorageKey)
    const token = this.storage.getItem(this.tokenStorageKey)

    if (!chatId) {
      onError(new Error('Chat ID not found. Please initialize a chat first.'))
      return
    }

    if (!token) {
      onError(
        new Error(
          'Authentication token not found. Please initialize a chat first.'
        )
      )
      return
    }

    // Create a new AbortController for this request
    this.abortController = new AbortController()
    const { signal } = this.abortController

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/chats/${chatId}/stream`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          method: 'POST',
          body: JSON.stringify({ content }),
          signal
        }
      )

      if (!response.ok) {
        onError(new Error(`HTTP error! Status: ${response.status}`))
        return
      }

      if (!response.body) {
        onError(new Error('Response body is null'))
        return
      }

      // Read a stream of server-sent events
      const reader = response.body.getReader()
      const textDecoder = new TextDecoder()
      let fullText = ''

      const isDone = false
      while (!isDone) {
        const { value, done } = await reader.read()

        if (done) {
          break
        }

        const decodedValue = textDecoder.decode(value)
        if (decodedValue) {
          fullText += decodedValue
          onChunk(decodedValue)
        }
      }

      onComplete(fullText)
    } catch (error) {
      // Ignore aborted request errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      onError(
        // TODO: Need better error messages
        error instanceof Error ? error : new Error('Failed to stream message')
      )
    } finally {
      this.abortController = undefined
    }
  }

  /**
   * Cancel ongoing stream if one exists
   */
  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = undefined
    }
  }
}
