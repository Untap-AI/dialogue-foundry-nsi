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
  generateStreamingChatCompletion,
  DEFAULT_SETTINGS
} from '../services/openai-service'
import { generateChatAccessToken } from '../lib/jwt-utils'
import {
  authenticateChatAccess,
  authenticateUser
} from '../middleware/auth-middleware'
import { getChatConfigByCompanyId } from '../db/chat-configs'
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
    const { userId, name, companyId } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Chat name is required' })
    }

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    let chatConfig = cacheService.getChatConfig(companyId)
    if (!chatConfig) {
      const dbConfig = await getChatConfigByCompanyId(companyId)
      if (dbConfig) {
        chatConfig = dbConfig
        cacheService.setChatConfig(companyId, dbConfig)
      }
      else {
        return res.status(400).json({ error: 'Chat config not found' })
      }
    }

    console.log('userId', userId)

    const chat = await createChatAdmin({
      name,
      user_id: userId || uuidv4(),
      company_id: companyId
    })

    // Generate a JWT token for chat access
    const accessToken = generateChatAccessToken(chat.id, userId)

    return res.status(201).json({
      chat,
      accessToken
    })
  } catch (error) {
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


// Send a streaming message and get a response (requires chat-specific authentication)
// Support both POST and GET methods for compatibility with EventSource
router.post('/:chatId/stream', authenticateChatAccess, handleStreamRequest)
router.get('/:chatId/stream', authenticateChatAccess, handleStreamRequest)

// Shared handler function for stream requests
async function handleStreamRequest(req: CustomRequest, res: express.Response) {
  // Set the proper headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable buffering for Nginx

  try {
    const { chatId } = req.params

    // Get content from body (POST) or query params (GET)
    const content = req.body.content || req.query.content
    const model = req.body.model || req.query.model
    const temperature = req.body.temperature || req.query.temperature
    
    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    // Use the authenticated user's ID from the JWT token
    // This is set by the authenticateChatAccess middleware
    const userId = req.user?.userId

    console.log('userId', userId)
    console.log('content', content)

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
    // TODO: Make this reusable for other routes
    let chatConfig = cacheService.getChatConfig(companyId)
    if (!chatConfig) {
      const dbConfig = await getChatConfigByCompanyId(companyId)
      if (dbConfig) {
        chatConfig = dbConfig
        cacheService.setChatConfig(companyId, dbConfig)
      }
      else {
        return res.status(400).json({
          error: 'The company associated with this chat is not available. Please create a chat with a valid company ID.'
        })
      } 
    }

    // Get chat settings - using request parameters, chat config, or defaults
    const chatSettings: ChatSettings = {
      model: model || DEFAULT_SETTINGS.model,
      temperature: temperature
        ? parseFloat(temperature as string)
        : DEFAULT_SETTINGS.temperature,
      systemPrompt: chatConfig?.system_prompt || undefined,
      // Pass company ID and support email if available
      companyId: companyId,
      enableEmailFunction: Boolean(chatConfig?.support_email)
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

    // Send initial SSE message to confirm connection
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
    res.flushHeaders()

    // Define SSE-formatted chunk sender
    const onChunk = (chunk: string) => {
      // Ensure the response is still writable
      if (!res.writableEnded) {
        // Format the chunk as a Server-Sent Event
        res.write(
          `data: ${JSON.stringify({
            type: 'chunk',
            content: chunk
          })}\n\n`
        )

        // Force immediate sending of the chunk
        res.flushHeaders()
      }
    }

    // Generate streaming response from OpenAI
    const aiResponseContent = await generateStreamingChatCompletion(
      openaiMessages,
      chatSettings,
      onChunk
    )

    // Store the complete AI response in the database
    await createMessageAdmin({
      chat_id: chatId,
      user_id: userId,
      content:
        aiResponseContent || 'Sorry, I was unable to generate a response.',
      role: 'assistant',
      sequence_number: nextSequenceNumber + 1
    })

    // Send a completion message
    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          fullContent: aiResponseContent
        })}\n\n`
      )

      // Force flush to ensure all content is sent
      res.flushHeaders()

      // Small delay to ensure client receives all data
      await new Promise(resolve => setTimeout(resolve, 100))

      // Send a clean termination signal
      res.write(':\n\n')
    }

    // End the response properly
    if (!res.writableEnded) {
      res.end()
    }

    // Handle client disconnect
    return req.on('close', () => {
      console.info('Client disconnected')
      if (!res.writableEnded) {
        res.end()
      }
    })
  } catch (error) {
    console.error('Error in streaming chat message endpoint:', error)
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      console.log('Sending error response to client - headers not sent yet')

      // Check if this is an authentication error
      if (
        error instanceof Error &&
        error.message &&
        (error.message.includes('token') ||
          error.message.includes('authenticate'))
      ) {
        const errorData = {
          type: 'error',
          error:
            'Invalid or expired token. Please reinitialize your chat session.',
          code: 'TOKEN_INVALID'
        }
        console.log('Error data being sent:', errorData)
        res.write(`data: ${JSON.stringify(errorData)}\n\n`)
        // Send a clean termination signal
        res.write(':\n\n')
        return res.end()
      }

      console.log('Sending generic streaming error to client')
      const errorData = {
        type: 'error',
        error: 'An error occurred processing your request',
        code: 'STREAMING_ERROR'
      }
      console.log('Error data being sent:', errorData)
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      // Send a clean termination signal
      res.write(':\n\n')
      return res.end()
    }

    // Send an error event if headers have been sent
    if (!res.writableEnded) {
      console.log('Sending error response to client - headers already sent')

      // Determine error code based on the error message
      let errorCode = 'STREAMING_ERROR'
      if (error instanceof Error) {
        if (
          error.message.includes('token') ||
          error.message.includes('authenticate')
        ) {
          errorCode = 'TOKEN_INVALID'
        }
      }

      const errorData = {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        code: errorCode
      }
      console.log('Error data being sent:', errorData)
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      // Send a clean termination signal
      res.write(':\n\n')
    }

    return res.end()
  }
}

export default router
