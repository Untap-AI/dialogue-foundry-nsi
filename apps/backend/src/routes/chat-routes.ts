import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  getChatById,
  getChatsByUserId,
  updateChat,
  deleteChat,
  createChatAdmin,
  getChatsByCompanyId
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
import { getChatConfigWithFallback } from '../db/chat-configs'
import {
  retrieveDocuments,
  formatDocumentsAsContext
} from '../services/pinecone-service'
import { cacheService } from '../services/cache-service'
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

    // Check cache first
    let chat = cacheService.getChat(chatId)
    if (!chat) {
      const dbChat = await getChatById(chatId)
      if (dbChat) {
        // Cache the chat for future requests
        cacheService.setChat(chatId, dbChat)
        chat = dbChat
      }
    }

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
    const { userId, name: chatName, companyId } = req.body

    // Generate a new user ID if not provided
    const generatedUserId = userId ?? uuidv4()

    // If companyId is provided, verify it exists in chat_configs
    if (companyId) {
      // Try to get config from cache first
      let chatConfig = cacheService.getChatConfig(companyId)
      if (!chatConfig) {
        // If not in cache, check the database
        try {
          const dbConfig = await getChatConfigWithFallback(companyId)
          if (dbConfig) {
            chatConfig = dbConfig
            cacheService.setChatConfig(companyId, dbConfig)
          }
        } catch (configError) {
          console.error(
            `Error fetching chat config for companyId ${companyId}:`,
            configError
          )
          return res.status(400).json({
            error: `Invalid company ID. No configuration found for "${companyId}".`
          })
        }
      }

      if (!chatConfig) {
        return res.status(400).json({
          error: `Invalid company ID. No configuration found for "${companyId}".`
        })
      }
    }

    // Create the chat using the admin function to bypass RLS
    const newChat = await createChatAdmin({
      user_id: generatedUserId,
      name: chatName || 'New Chat',
      company_id: companyId
    })

    // Cache the newly created chat
    cacheService.setChat(newChat.id, newChat)

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

// Get all chats for a specific company
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const chats = await getChatsByCompanyId(companyId)

    return res.json({ chats })
  } catch (error) {
    console.error('Error getting company chats:', error)
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

    const { name: chatName } = req.body

    const updatedChat = await updateChat(chatId, {
      name: chatName,
      updated_at: new Date().toISOString()
    })

    // Update the cache with the new data
    if (updatedChat) {
      cacheService.setChat(chatId, updatedChat)
    }

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

    // Remove from cache
    cacheService.deleteChat(chatId)

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
      const { content, model, temperature } = req.body

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

      // Check cache first before database query
      let chat = cacheService.getChat(chatId)
      if (!chat) {
        const dbChat = await getChatById(chatId)
        if (dbChat) {
          chat = dbChat
          cacheService.setChat(chatId, dbChat)
        }
      }

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' })
      }

      // Get the company ID from the chat
      const companyId = chat.company_id

      // If the chat doesn't have a company_id, use the default
      if (!companyId) {
        return res.status(400).json({
          error:
            'This chat is not associated with any company. Please create a new chat with a company ID.'
        })
      }

      // Get the company-specific configuration or fall back to default
      // Try to get config from cache first
      let chatConfig = cacheService.getChatConfig(companyId)
      if (!chatConfig) {
        const dbConfig = await getChatConfigWithFallback(companyId)
        if (dbConfig) {
          chatConfig = dbConfig
          cacheService.setChatConfig(companyId, dbConfig)
        }
      }

      // Get chat settings - using request parameters, chat config, or defaults
      // Only use system prompt from the config, not from the chat
      const chatSettings: ChatSettings = {
        model: model || DEFAULT_SETTINGS.model,
        temperature: temperature || DEFAULT_SETTINGS.temperature,
        systemPrompt: chatConfig?.system_prompt || undefined
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

      // Retrieve relevant documents from Pinecone if an index is configured
      let contextFromDocs = ''
      if (chatConfig?.pinecone_index_name) {
        try {
          const documents = await retrieveDocuments(companyId, content)
          if (documents && documents.length > 0) {
            contextFromDocs = formatDocumentsAsContext(documents)
          }
        } catch (retrievalError) {
          console.error('Error during document retrieval:', retrievalError)
          // Continue without document retrieval if it fails
        }
      }

      // If we retrieved context, add it as a system message
      if (contextFromDocs) {
        openaiMessages.push({
          role: 'system',
          content: contextFromDocs
        })
      }

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

    // Check cache first before database query
    let chat = cacheService.getChat(chatId)
    if (!chat) {
      const dbChat = await getChatById(chatId)
      if (dbChat) {
        chat = dbChat
        cacheService.setChat(chatId, dbChat)
      }
    }

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    // Get the company ID from the chat
    const companyId = chat.company_id

    // If the chat doesn't have a company_id, return an error
    if (!companyId) {
      return res.status(400).json({
        error:
          'This chat is not associated with any company. Please create a new chat with a company ID.'
      })
    }

    // Try to get config from cache first
    let chatConfig = cacheService.getChatConfig(companyId)
    if (!chatConfig) {
      const dbConfig = await getChatConfigWithFallback(companyId)
      if (dbConfig) {
        chatConfig = dbConfig
        cacheService.setChatConfig(companyId, dbConfig)
      }
    }

    // Get chat settings - using request parameters, chat config, or defaults
    const chatSettings: ChatSettings = {
      model: model || DEFAULT_SETTINGS.model,
      temperature: temperature
        ? parseFloat(temperature as string)
        : DEFAULT_SETTINGS.temperature,
      systemPrompt: chatConfig?.system_prompt || undefined
    }

    // Get all previous messages in this chat
    const previousMessages = await getMessagesByChatId(chatId)

    // Get the next sequence number
    const latestSequenceNumber = await getLatestSequenceNumber(chatId)
    const nextSequenceNumber = latestSequenceNumber + 1

    // Create both messages upfront but only insert the user message immediately
    const userMessageData = {
      chat_id: chatId,
      user_id: userId,
      content,
      role: 'user',
      sequence_number: nextSequenceNumber
    }

    // Save the user message using admin function to bypass RLS
    await createMessageAdmin(userMessageData)

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

    console.log('content', content)

    // Retrieve relevant documents from Pinecone if an index is configured
    let contextFromDocs = ''
    if (chatConfig?.pinecone_index_name) {
      try {
        const documents = await retrieveDocuments(
          chatConfig.pinecone_index_name,
          content
        )
        if (documents && documents.length > 0) {
          contextFromDocs = formatDocumentsAsContext(documents)
        }
      } catch (retrievalError) {
        console.error('Error during document retrieval:', retrievalError)
        // Continue without document retrieval if it fails
      }
    }

    // If we retrieved context, add it as a system message
    if (contextFromDocs) {
      openaiMessages.push({
        role: 'system',
        content: contextFromDocs
      })
    }

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
