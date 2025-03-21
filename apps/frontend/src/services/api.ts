import axios from 'axios'
import type { AxiosRequestConfig, AxiosError } from 'axios'
import type { ChatItem } from '@nlux/react'

// Backend API base URL - should come from env variable in a real app
const API_BASE_URL = 'http://localhost:3000/api'

// Token storage key
const TOKEN_STORAGE_KEY = 'chat_access_token'
const CHAT_ID_STORAGE_KEY = 'chat_id'

interface Message {
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

interface ChatInit {
  chatId: string
  messages: ChatItem[]
}

interface MessageResponse {
  userMessage: Message
  aiMessage: Message
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add a request interceptor to include the token in all requests
api.interceptors.request.use(
  (config: typeof AxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (token && config.headers) {
      Object.assign(config.headers, {
        Authorization: `Bearer ${token}`
      })
    }
    return config
  },
  (error: typeof AxiosError) => {
    return Promise.reject(error)
  }
)

/**
 * Initialize the chat system
 * - Checks for existing token and chat ID
 * - If not found, creates a new chat
 * - Returns the chat data and conversation history
 */
export const initializeChat = async (): Promise<ChatInit> => {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
  const storedChatId = localStorage.getItem(CHAT_ID_STORAGE_KEY)

  // If we have both a token and chat ID, try to load the existing chat
  if (storedToken && storedChatId) {
    try {
      const response = await api.get(`/chats/${storedChatId}`)

      return {
        chatId: storedChatId,
        messages: mapMessagesToNluxFormat(response.data.messages || [])
      }
    } catch (error) {
      console.error('Error loading existing chat:', error)
      // If there's an error (e.g., token expired), clear storage and create a new chat
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(CHAT_ID_STORAGE_KEY)
    }
  }

  // Create a new chat
  return createNewChat()
}

/**
 * Create a new chat session
 * @param userId - User identifier
 */
export const createNewChat = async (): Promise<ChatInit> => {
  try {
    const response = await api.post('/chats', {
      name: 'New Conversation'
    })

    // Store token and chat ID
    localStorage.setItem(TOKEN_STORAGE_KEY, response.data.accessToken)
    localStorage.setItem(CHAT_ID_STORAGE_KEY, response.data.chat.id)

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
export const sendMessage = async (
  content: string
): Promise<MessageResponse> => {
  const chatId = localStorage.getItem(CHAT_ID_STORAGE_KEY)

  if (!chatId) {
    throw new Error('Chat ID not found. Please initialize a chat first.')
  }

  try {
    const response = await api.post(`/chats/${chatId}/messages`, {
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
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      localStorage.removeItem(CHAT_ID_STORAGE_KEY)

      // Re-initialize the chat
      await initializeChat()

      // Try sending the message again
      return sendMessage(content)
    }

    throw error
  }
}

/**
 * Clear the current chat session and create a new one
 */
export const startNewChat = async (): Promise<ChatInit> => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(CHAT_ID_STORAGE_KEY)

  return createNewChat()
}

/**
 * Map backend message format to NLUX format
 * @param messages - Backend messages
 */
function mapMessagesToNluxFormat(messages: Message[]): ChatItem[] {
  return messages.map(message => ({
    id: message.id,
    message: message.content,
    role: message.role === 'user' ? 'user' : 'assistant',
    timestamp: new Date(message.created_at).getTime()
  }))
}
