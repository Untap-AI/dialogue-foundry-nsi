import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  getChatById,
  createChatAdmin,
  updateChatUserEmailAdmin
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
import { 
  detectEmailRequest, 
  processUserEmailInMessage 
} from '../services/utils/email-detection'
import { generateChatAccessToken } from '../lib/jwt-utils'
import {
  authenticateChatAccess,
} from '../middleware/auth-middleware'
import { getChatConfigByCompanyId } from '../db/chat-configs'
import {
  retrieveDocuments,
  formatDocumentsAsContext
} from '../services/pinecone-service'

import { logger } from '../lib/logger'
import type { CustomRequest } from '../middleware/auth-middleware'
import type { Message, ChatSettings } from '../services/openai-service'
import { sendInquiryEmail } from '../services/sendgrid-service'

const router = express.Router()

// Get a chat by ID with its messages (requires chat-specific authentication)
router.get('/:chatId', authenticateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params

    if (!chatId) {
      return res.status(400).json({ error: 'Chat ID is required' })
    }

    // Get chat from database
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
    const {
      userId: userIdParam,
      name: chatName,
      companyId,
      welcomeMessage
    } = req.body

    if (!chatName) {
      logger.error('Chat name is required', {
        userId: req.body.userId
      })
      return res.status(400).json({ error: 'Chat name is required' })
    }

    if (!companyId) {
      logger.error('Company ID is required', {
        userId: req.body.userId
      })
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const chatConfig = await getChatConfigByCompanyId(companyId)
    if (!chatConfig) {
      logger.error('Chat config not found', {
        userId: req.body.userId
      })
      return res.status(400).json({ error: 'Chat config not found' })
    }

    const userId = userIdParam === 'undefined' || userIdParam === undefined ? uuidv4() : userIdParam

    const chat = await createChatAdmin({
      name: chatName,
      user_id: userId,
      company_id: companyId
    })

    if (welcomeMessage) {
      try {
        await createMessageAdmin({
          chat_id: chat.id,
          user_id: userId,
          content: welcomeMessage,
          role: 'assistant',
          sequence_number: 1
        })
      } catch (error) {
        logger.error('Error creating welcome message', {
          error: error as Error,
          chatId: chat.id
        })
      }
    }

    // Generate a JWT token for chat access
    const accessToken = generateChatAccessToken(chat.id, userId)

    return res.status(201).json({
      chat,
      accessToken
    })
  } catch (error) {
    logger.error('Error creating chat', {
      error: error as Error,
      userId: req.body.userId
    })
    return res.status(500).json({ error })
  }
})

// Add after other endpoints
router.post('/:chatId/send-email', authenticateChatAccess, async (req, res) => {
  try {
    const { chatId } = req.params
    const { userEmail, subject, conversationSummary } = req.body

    if (!chatId || !userEmail || subject === undefined || conversationSummary === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get chat and companyId
    const chat = await getChatById(chatId)

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' })
    }

    const companyId = chat.company_id
    if (!companyId) {
      return res.status(400).json({ error: 'Chat missing company ID' })
    }

    // Get recent messages for context (last 20, excluding system)
    const messages = await getMessagesByChatId(chatId)
    const recentMessages = messages.slice(-20).filter(msg => msg.role !== 'system')

    const emailSent = await sendInquiryEmail({
      userEmail,
      subject,
      conversationSummary,
      recentMessages,
      companyId
    })

    if (emailSent) {
      // Store the user's email in the chat record for future reference
      try {
        await updateChatUserEmailAdmin(chatId, userEmail)
        // Chat updated in database with email
      } catch (emailUpdateError) {
        // Log the error but don't fail the request since the email was sent successfully
        logger.error('Error updating chat with user email', {
          error: emailUpdateError as Error,
          chatId,
          userEmail
        })
      }
      
      return res.json({ success: true })
    } else {
      return res.status(500).json({ error: 'Failed to send email' })
    }
  } catch (error) {
    logger.error('Error sending email from /chats/:chatId/send-email', {
      error: error as Error,
      chatId: req.params.chatId
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// Shared handler function for stream requests
async function handleStreamRequest(req: CustomRequest, res: express.Response) {
  // Set the proper headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // Disable buffering for Nginx

  // Heartbeat to keep the connection alive through proxies/mobile networks
  let heartbeat: NodeJS.Timeout | undefined

  // Helper function to send errors via SSE
  const sendErrorEvent = (
    errorMessage: string,
    errorCode: string = 'STREAMING_ERROR'
  ) => {
    if (!res.writableEnded) {
      const errorData = {
        type: 'error',
        error: errorMessage,
        code: errorCode
      }
      logger.warn('Sending error event to client', {
        errorCode,
        errorMessage,
        endpoint: req.originalUrl
      })
      res.write(`data: ${JSON.stringify(errorData)}\n\n`)
      // Send a clean termination signal
      res.write(':\n\n')
      if (heartbeat) clearInterval(heartbeat)
      res.end()
    }
  }

  try {
    const { chatId } = req.params

    // Get content from body (POST) or query params (GET)
    const content = req.body.content || req.query.content
    const timezone = req.body.timezone || req.query.timezone || 'UTC'

    if (!chatId) {
      sendErrorEvent('Chat ID is required', 'INVALID_REQUEST')
      return
    }

    // Use the authenticated user's ID from the JWT token
    // This is set by the authenticateChatAccess middleware
    const userId = req.user?.userId

    if (!userId || !content) {
      sendErrorEvent(
        'User authentication and message content are required',
        'INVALID_REQUEST'
      )
      return
    }

    // Get chat from database
    const chat = await getChatById(chatId)

    if (!chat) {
      sendErrorEvent('Chat not found', 'NOT_FOUND')
      return
    }

    // Get the company ID from the chat
    const companyId = chat.company_id

    // If the chat doesn't have a company_id, return an error
    if (!companyId) {
      sendErrorEvent(
        'This chat is not associated with any company. Please create a new chat with a company ID.',
        'INVALID_CHAT'
      )
      return
    }

    // Get config from database
    const chatConfig = await getChatConfigByCompanyId(companyId)
    if (!chatConfig) {
      sendErrorEvent(
        'The company associated with this chat is not available. Please create a chat with a valid company ID.',
        'INVALID_COMPANY'
      )
      return
    }

    // Get chat settings - using request parameters, chat config, or defaults
    // Check if user has already provided their email to avoid requesting it again
    const hasUserEmail = Boolean(chat.user_email)
    
    const chatSettings: ChatSettings = {
      ...DEFAULT_SETTINGS,
      systemPrompt: chatConfig.system_prompt,
      // Pass company ID and support email if available
      companyId,
      enableEmailFunction: Boolean(chatConfig?.support_email) && !hasUserEmail,
      timezone,
      hasUserEmail
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
      // Change this to make first message a system message
      openaiMessages.unshift({
        role: 'system',
        content: contextFromDocs
      })
    }

    // Anti-buffering prelude and initial SSE message to confirm connection
    // Large comment line to prevent proxy buffering and help iOS start delivery quickly
    res.write(':' + ' '.repeat(2048) + '\n')
    res.write('\n')
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
    res.flushHeaders()

    // Start heartbeat after connection is established
    heartbeat = setInterval(() => {
      if (!res.writableEnded) {
        res.write(':\n\n')
      }
    }, 15000)

    // Small delay to ensure client handlers are attached on flaky/mobile browsers
    await new Promise(resolve => setTimeout(resolve, 50))

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

    // Generate streaming response from OpenAI (main content generation)
    let aiResponseContent
    try {
      aiResponseContent = await generateStreamingChatCompletion(
        openaiMessages,
        chatSettings,
        onChunk
      )
    } catch (streamError) {
      logger.error('Error in streaming chat completion', {
        error: streamError as Error,
        chatId
      })

      throw streamError
    }

    // Save the assistant's response to the database
    await createMessageAdmin({
      chat_id: chatId,
      user_id: userId,
      content:
        aiResponseContent || 'Sorry, I was unable to generate a response.',
      role: 'assistant',
      sequence_number: nextSequenceNumber + 1
    })

    // After main streaming is complete, run email detection using smaller LLM
    try {
      if (aiResponseContent) {
        const emailDetectionResult = await detectEmailRequest(
          aiResponseContent,
          openaiMessages,
          chatSettings
        )

        if (emailDetectionResult?.success) {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify(emailDetectionResult.details)}\n\n`)
              res.flushHeaders()
            }
        }
      }
    } catch (emailDetectionError) {
      logger.warn('Error in email detection (non-critical)', {
        error: emailDetectionError as Error,
        chatId
      })
      // Don't throw - email detection failure shouldn't break the main flow
    }

    // Check if user provided email directly in their message (async, non-blocking)
    setImmediate(async () => {
      try {
        await processUserEmailInMessage(
          content,
          chatId,
          openaiMessages,
          chatSettings,
          chatConfig?.support_email || '',
          Boolean(chat?.user_email)
        )
      } catch (userEmailProcessingError) {
        logger.warn('Error in user email processing (non-critical)', {
          error: userEmailProcessingError as Error,
          chatId
        })
        // Don't throw - this is a non-critical feature
      }
    })

    // Send a completion message
    if (!res.writableEnded) {
      try {
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            fullContent: aiResponseContent
          })}\n\n`
        )

        // Force flush to ensure all content is sent
        res.flushHeaders()

        // Send a clean termination signal
        res.write(':\n\n')
        if (heartbeat) clearInterval(heartbeat)
        res.end()
      } catch (responseError) {
        logger.error('Error sending completion event', {
          error: responseError as Error,
          chatId
        })
      }
    }

    // Handle client disconnect
    return req.on('close', () => {
      if (!res.writableEnded) {
        if (heartbeat) clearInterval(heartbeat)
        // Ensure full stream
        setTimeout(() => {
          res.end()
        }, 50)
      }
    })
  } catch (error) {
    logger.error('Error in streaming chat message endpoint', {
      error: error as Error,
      chatId: req.params.chatId,
      userId: req.user?.userId
    })

    // Send appropriate error message based on the error type
    sendErrorEvent(
      error instanceof Error
        ? error.message
        : 'An error occurred processing your request'
    )

    return
  }
}

router.post('/:chatId/stream', authenticateChatAccess, handleStreamRequest)
router.get('/:chatId/stream', authenticateChatAccess, handleStreamRequest)

export default router
