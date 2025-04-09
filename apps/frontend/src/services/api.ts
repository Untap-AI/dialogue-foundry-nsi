import axios from 'axios'
import type { AxiosError } from 'axios'
import type { ChatItem } from '@nlux/react'
import { ApiError, ErrorCodes as ServiceErrorCodes, ErrorCodeValue } from './errors'

// Default config values (can be overridden)
export const DEFAULT_TOKEN_STORAGE_KEY = 'dialogue_foundry_token'
export const DEFAULT_CHAT_ID_STORAGE_KEY = 'dialogue_foundry_chat_id'

// Custom error class for API errors
export class ChatApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  
  constructor(message: string, statusCode?: number, errorCode?: string) {
    super(message);
    this.name = 'ChatApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export interface ChatConfig {
  apiBaseUrl: string
  companyId: string
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
  private companyId: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private api: ReturnType<typeof axios.create>

  constructor(config: ChatConfig) {
    this.apiBaseUrl = config.apiBaseUrl
    this.companyId = config.companyId
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = localStorage

    // Create axios instance
    this.api = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
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
    
    // Add a response interceptor to handle errors consistently
    this.api.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          // The request was made and the server responded with an error status
          const status = error.response.status;
          const data = error.response.data as any;
          
          let errorMessage = 'An error occurred while communicating with the server.';
          let errorCode: ErrorCodeValue = ServiceErrorCodes.UNKNOWN_ERROR;
          
          // Check if there's a specific error in the response
          if (data && data.error) {
            errorMessage = typeof data.error === 'string' 
              ? data.error 
              : (data.error.message || errorMessage);
              
            errorCode = data.code || `HTTP_${status}`;
          }
          
          // Create friendly messages for common HTTP status codes
          switch (status) {
            case 401:
              errorMessage = 'Your session has expired. Please reload the page to continue.';
              errorCode = ServiceErrorCodes.AUTH_EXPIRED;
              break;
            case 403:
              errorMessage = 'You don\'t have permission to perform this action.';
              errorCode = ServiceErrorCodes.AUTH_FORBIDDEN;
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              errorCode = ServiceErrorCodes.NOT_FOUND;
              break;
            case 429:
              errorMessage = 'You\'ve made too many requests. Please wait a moment and try again.';
              errorCode = ServiceErrorCodes.RATE_LIMITED;
              break;
            case 500:
            case 502:
            case 503:
            case 504:
              errorMessage = 'The server encountered an error. Please try again later.';
              errorCode = ServiceErrorCodes.SERVER_ERROR;
              break;
          }
          
          return Promise.reject(new ApiError(errorCode, false));
        } else if (error.request) {
          // The request was made but no response was received
          return Promise.reject(
            new ApiError(
              ServiceErrorCodes.NETWORK_ERROR,
              true
            )
          );
        } else {
          // Something happened in setting up the request
          return Promise.reject(
            new ApiError(
              ServiceErrorCodes.REQUEST_FAILED,
              false
            )
          );
        }
      }
    );
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
        
        // Create a new chat with a more informative message about what happened
        console.info('Creating new chat after failed loading of existing chat');
      }
    }

    console.log('Creating new chat')

    // Create a new chat
    return this.createNewChat()
  }

  /**
   * Create a new chat session
   */
  async createNewChat(): Promise<ChatInit> {
    try {
      const response = await this.api.post('/chats', {
        name: 'New Conversation',
        companyId: this.companyId
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
      
      // Throw a more informative error
      if (error instanceof ApiError) {
        throw error;
      } else {
        throw new ApiError(
          ServiceErrorCodes.CHAT_CREATION_FAILED,
          false
        );
      }
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
