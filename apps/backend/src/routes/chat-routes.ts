import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  getChatById,
  getChatsByUserId,
  updateChat,
  deleteChat,
  createChatAdmin
} from '../db/chats'
import {
  getMessagesByChatId,
  getLatestSequenceNumber,
  createMessageAdmin
} from '../db/messages'
import {
  generateChatCompletion,
  generateStreamingChatCompletion,
  DEFAULT_SETTINGS
} from '../services/openai-service'
import { generateChatAccessToken } from '../lib/jwt-utils'
import {
  authenticateChatAccess,
  authenticateUser
} from '../middleware/auth-middleware'
import type { CustomRequest } from '../middleware/auth-middleware'
import type { Message, ChatSettings } from '../services/openai-service'

const router = express.Router()

// Get all chats for a user (requires user authentication)
router.get(
  '/user/:userId',
  authenticateUser,
  async (req: CustomRequest, res) => {
    try {
      // Ensure the requesting user can only access their own chats
      const { userId } = req.params

      // Ensure userId is a string
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      // Check if the authenticated user is requesting their own chats
      if (req.user?.userId !== userId) {
        return res
          .status(403)
          .json({ error: 'You can only access your own chats' })
      }

      const chats = await getChatsByUserId(userId)
      return res.json(chats)
    } catch (error) {
      return res.status(500).json({ error })
    }
  }
)

// Get a chat by ID with its messages (requires chat-specific authentication)
router.get('/:chatId', authenticateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    const chat = await getChatById(chatId)

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    const messages = await getMessagesByChatId(chatId)

    return res.json({ chat, messages })
  } catch (error) {
    return res.status(500).json({ error })
  }
})

// Create a new chat and return access token
router.post('/', async (req, res) => {
  try {
    const { userId, name: chatName, systemPrompt } = req.body

    // Generate a new user ID if not provided
    const generatedUserId = userId ?? uuidv4()

    // Create the chat using the admin function to bypass RLS
    const newChat = await createChatAdmin({
      user_id: generatedUserId,
      name: chatName || 'New Chat',
      system_prompt: systemPrompt || undefined
    })

    // Generate access token for this chat
    const token = generateChatAccessToken(newChat.id, generatedUserId)

    return res.status(201).json({
      chat: newChat,
      accessToken: token
    })
  } catch (error) {
    console.error('Error creating chat:', error)
    return res.status(500).json({ error })
  }
})

// Update a chat (requires chat-specific authentication)
router.put('/:chatId', authenticateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    const { name: chatName, systemPrompt } = req.body

    const updatedChat = await updateChat(chatId, {
      name: chatName,
      system_prompt: systemPrompt,
      updated_at: new Date().toISOString()
    })

    return res.json(updatedChat)
  } catch (error) {
    return res.status(500).json({ error })
  }
})

// Delete a chat (requires chat-specific authentication)
router.delete('/:chatId', authenticateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    await deleteChat(chatId)
    return res.json({ success: true })
  } catch (error) {
    return res.status(500).json({ error })
  }
})

// Send a message and get a response (requires chat-specific authentication)
router.post(
  '/:chatId/messages',
  authenticateChatAccess,
  async (req: CustomRequest, res) => {
    try {
      const { chatId } = req.params
      const { content, model, temperature, maxMessagesInContext } = req.body

      if (!chatId) {
        return res.status(400).json({ error: 'Chat ID is required' })
      }

      // Use the authenticated user's ID from the JWT token
      const userId = req.user?.userId

      if (!userId || !content) {
        return res.status(400).json({
          error: 'User authentication and message content are required'
        })
      }

      const chat = await getChatById(chatId)
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' })
      }

      // Get chat settings - using request parameters or defaults
      const chatSettings: ChatSettings = {
        model: model || DEFAULT_SETTINGS.model,
        temperature: temperature || DEFAULT_SETTINGS.temperature,
        systemPrompt: chat.system_prompt || undefined,
        maxMessagesInContext: maxMessagesInContext
          ? parseInt(maxMessagesInContext)
          : undefined
      }

      // Get all previous messages in this chat
      const previousMessages = await getMessagesByChatId(chatId)

      // Get the next sequence number
      const latestSequenceNumber = await getLatestSequenceNumber(chatId)
      const nextSequenceNumber = latestSequenceNumber + 1

      // Save the user message using admin function to bypass RLS
      const userMessage = await createMessageAdmin({
        chat_id: chatId,
        user_id: userId,
        content,
        role: 'user',
        sequence_number: nextSequenceNumber
      })

      // Prepare messages for OpenAI API
      const openaiMessages: Message[] = previousMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }))

      // Add the new user message
      openaiMessages.push({
        role: 'user',
        content
      })

      // Generate response from OpenAI
      const aiResponseContent = await generateChatCompletion(
        openaiMessages,
        chatSettings
      )

      // Save the AI response using admin function to bypass RLS
      const aiMessage = await createMessageAdmin({
        chat_id: chatId,
        user_id: userId,
        content:
          aiResponseContent || 'Sorry, I was unable to generate a response.',
        role: 'assistant',
        sequence_number: nextSequenceNumber + 1
      })

      return res.json({
        userMessage,
        aiMessage
      })
    } catch (error) {
      console.error('Error in chat message endpoint:', error)
      return res.status(500).json({ error })
    }
  }
)

// Send a streaming message and get a response (requires chat-specific authentication)
// Support both POST and GET methods for compatibility with EventSource
router.post('/:chatId/stream', authenticateChatAccess, handleStreamRequest)
router.get('/:chatId/stream', authenticateChatAccess, handleStreamRequest)

// Shared handler function for stream requests
async function handleStreamRequest(req: CustomRequest, res: express.Response) {
  try {
    const { chatId } = req.params

    // Check if token is provided in query parameters (for EventSource)
    const tokenFromQuery = req.query.token as string

    if (tokenFromQuery && !req.headers.authorization) {
      // Use Object.assign to modify headers without directly reassigning properties
      Object.assign(req.headers, { authorization: `Bearer ${tokenFromQuery}` })
    }

    // Get content from body (POST) or query params (GET)
    const content = req.body.content || req.query.content
    const model = req.body.model || req.query.model
    const temperature = req.body.temperature || req.query.temperature
    const maxMessagesInContext =
      req.body.maxMessagesInContext || req.query.maxMessagesInContext

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    // Use the authenticated user's ID from the JWT token
    const userId = req.user?.userId

    if (!userId || !content) {
      return res
        .status(400)
        .json({ error: 'User authentication and message content are required' })
    }

    const chat = await getChatById(chatId)
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    // Get chat settings - using request parameters or defaults
    const chatSettings: ChatSettings = {
      model: model || DEFAULT_SETTINGS.model,
      temperature: temperature
        ? parseFloat(temperature)
        : DEFAULT_SETTINGS.temperature,
      systemPrompt: chat.system_prompt || undefined,
      maxMessagesInContext: maxMessagesInContext
        ? parseInt(maxMessagesInContext as string)
        : undefined
    }

    // Get all previous messages in this chat
    const previousMessages = await getMessagesByChatId(chatId)

    // Get the next sequence number
    const latestSequenceNumber = await getLatestSequenceNumber(chatId)
    const nextSequenceNumber = latestSequenceNumber + 1

    // Save the user message using admin function to bypass RLS
    await createMessageAdmin({
      chat_id: chatId,
      user_id: userId,
      content,
      role: 'user',
      sequence_number: nextSequenceNumber
    })

    // Prepare messages for OpenAI API
    const openaiMessages: Message[] = [
      ...previousMessages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content
      }
    ]

    const onChunk = (chunk: string) => {
      res.write(chunk)
    }

    // Generate streaming response from OpenAI
    const aiResponseContent = await generateStreamingChatCompletion(
      openaiMessages,
      chatSettings,
      onChunk
    )

    await createMessageAdmin({
      chat_id: chatId,
      user_id: userId,
      content:
        aiResponseContent || 'Sorry, I was unable to generate a response.',
      role: 'assistant',
      sequence_number: nextSequenceNumber + 1
    })

    res.end()

    // Handle client disconnect
    return req.on('close', () => {
      console.info('Client disconnected')
      res.end()
    })
  } catch (error) {
    console.error('Error in streaming chat message endpoint:', error)
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({ error })
    }

    return res.status(500).json({ error })
  }
}

export default router
