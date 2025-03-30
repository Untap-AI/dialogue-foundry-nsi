import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ChatItem } from '@nlux/react'

// Default config values (can be overridden)
export const DEFAULT_TOKEN_STORAGE_KEY = 'dialogue_foundry_token'
export const DEFAULT_CHAT_ID_STORAGE_KEY = 'dialogue_foundry_chat_id'

export interface ChatConfig {
  apiBaseUrl: string
  tokenStorageKey?: string
  chatIdStorageKey?: string
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

  constructor(config: ChatConfig) {
    this.apiBaseUrl = config.apiBaseUrl
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = localStorage

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
  async initializeChat({
    systemPrompt
  }: {
    systemPrompt: string
  }): Promise<ChatInit> {
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
    return this.createNewChat(systemPrompt)
  }

  /**
   * Create a new chat session
   */
  async createNewChat(systemPrompt: string): Promise<ChatInit> {
    try {
      const response = await this.api.post('/chats', {
        // TODO: Make this dynamic
        name: 'New Conversation',
        systemPrompt
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
   * Clear the current chat session and create a new one
   */
  async startNewChat(systemPrompt: string): Promise<ChatInit> {
    this.storage.removeItem(this.tokenStorageKey)
    this.storage.removeItem(this.chatIdStorageKey)

    return this.createNewChat(systemPrompt)
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
