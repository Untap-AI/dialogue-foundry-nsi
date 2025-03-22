import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ChatItem } from '@nlux/react'

// Default config values (can be overridden)
export const DEFAULT_API_BASE_URL = 'http://localhost:3000/api'
export const DEFAULT_TOKEN_STORAGE_KEY = 'chat_access_token'
export const DEFAULT_CHAT_ID_STORAGE_KEY = 'chat_id'

export interface ChatConfig {
  apiBaseUrl?: string
  tokenStorageKey?: string
  chatIdStorageKey?: string
  storage?: Storage
}

export interface Message {
  id: string
  chat_id: string
  user_id: string
  content: string
  role: string
  sequence_number: number
  created_at: string
  updated_at: string | null
  title?: string | null
}

export interface ChatInit {
  chatId: string
  messages: ChatItem[]
}

export interface MessageResponse {
  userMessage: Message
  aiMessage: Message
}

export class ChatApiService {
  private apiBaseUrl: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private api: ReturnType<typeof axios.create>

  constructor(config: ChatConfig = {}) {
    this.apiBaseUrl = config.apiBaseUrl || DEFAULT_API_BASE_URL
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = config.storage || localStorage

    // Create axios instance
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add a request interceptor to include the token in all requests
    this.api.interceptors.request.use(
      requestConfig => {
        const token = this.storage.getItem(this.tokenStorageKey)
        if (token && requestConfig.headers) {
          Object.assign(requestConfig.headers, {
            Authorization: `Bearer ${token}`
          })
        }
        return requestConfig
      },
      (error: AxiosError) => {
        return Promise.reject(error)
      }
    )
  }

  /**
   * Initialize the chat system
   * - Checks for existing token and chat ID
   * - If not found, creates a new chat
   * - Returns the chat data and conversation history
   */
  async initializeChat(): Promise<ChatInit> {
    const storedToken = this.storage.getItem(this.tokenStorageKey)
    const storedChatId = this.storage.getItem(this.chatIdStorageKey)

    // If we have both a token and chat ID, try to load the existing chat
    if (storedToken && storedChatId) {
      try {
        const response = await this.api.get(`/chats/${storedChatId}`)

        return {
          chatId: storedChatId,
          messages: this.mapMessagesToNluxFormat(response.data.messages || [])
        }
      } catch (error) {
        console.error('Error loading existing chat:', error)
        // If there's an error (e.g., token expired), clear storage and create a new chat
        this.storage.removeItem(this.tokenStorageKey)
        this.storage.removeItem(this.chatIdStorageKey)
      }
    }

    // Create a new chat
    return this.createNewChat()
  }

  /**
   * Create a new chat session
   */
  async createNewChat(): Promise<ChatInit> {
    try {
      const response = await this.api.post('/chats', {
        name: 'New Conversation'
      })

      // Store token and chat ID
      this.storage.setItem(this.tokenStorageKey, response.data.accessToken)
      this.storage.setItem(this.chatIdStorageKey, response.data.chat.id)

      return {
        chatId: response.data.chat.id,
        messages: [] // New chat has no messages yet
      }
    } catch (error) {
      console.error('Error creating new chat:', error)
      throw error
    }
  }

  /**
   * Send a message to the chat and get the AI response
   * @param content - Message content
   */
  async sendMessage(content: string): Promise<MessageResponse> {
    const chatId = this.storage.getItem(this.chatIdStorageKey)

    if (!chatId) {
      throw new Error('Chat ID not found. Please initialize a chat first.')
    }

    try {
      const response = await this.api.post(`/chats/${chatId}/messages`, {
        content
      })

      return response.data as MessageResponse
    } catch (error) {
      console.error('Error sending message:', error)

      // If there's an authentication error, try to create a new chat
      if (
        typeof error === 'object' &&
        error &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response &&
        'status' in error.response &&
        typeof error.response.status === 'number' &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        this.storage.removeItem(this.tokenStorageKey)
        this.storage.removeItem(this.chatIdStorageKey)

        // Re-initialize the chat
        await this.initializeChat()

        // Try sending the message again
        return this.sendMessage(content)
      }

      throw error
    }
  }

  /**
   * Clear the current chat session and create a new one
   */
  async startNewChat(): Promise<ChatInit> {
    this.storage.removeItem(this.tokenStorageKey)
    this.storage.removeItem(this.chatIdStorageKey)

    return this.createNewChat()
  }

  /**
   * Get the current chat ID
   */
  getCurrentChatId(): string | null {
    return this.storage.getItem(this.chatIdStorageKey)
  }

  /**
   * Get the current authentication token
   */
  getCurrentToken(): string | null {
    return this.storage.getItem(this.tokenStorageKey)
  }

  /**
   * Map backend message format to NLUX format
   * @param messages - Backend messages
   */
  private mapMessagesToNluxFormat(messages: Message[]): ChatItem[] {
    return messages.map(message => ({
      id: message.id,
      message: message.content,
      role: message.role === 'user' ? 'user' : 'assistant',
      timestamp: new Date(message.created_at).getTime()
    }))
  }
}
