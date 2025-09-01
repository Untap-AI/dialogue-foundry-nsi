import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
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

// Shared validation and setup logic
async function setupStreamRequest(req: CustomRequest) {
  const { chatId } = req.params
  const { content, timezone = 'UTC' } = req.method === 'POST' ? req.body : req.query
  const userId = req.user?.userId

  if (!chatId || !content || !userId) {
    throw new Error('Chat ID, content, and authentication are required')
  }

  // Get and validate chat
  const chat = await getChatById(chatId)
  if (!chat) throw new Error('Chat not found')

  const companyId = chat.company_id
  if (!companyId) throw new Error('Chat not associated with company')

  // Get config
  const chatConfig = await getChatConfigByCompanyId(companyId)
  if (!chatConfig) throw new Error('Company configuration not found')

  // Chat settings
  const hasUserEmail = Boolean(chat.user_email)
  const chatSettings: ChatSettings = {
    ...DEFAULT_SETTINGS,
    systemPrompt: chatConfig.system_prompt,
    companyId,
    enableEmailFunction: Boolean(chatConfig?.support_email) && !hasUserEmail,
    timezone,
    hasUserEmail
  }

  return { chatId, content, userId, chat, chatConfig, chatSettings }
}

// Shared streaming logic
async function processStream(
  setupData: Awaited<ReturnType<typeof setupStreamRequest>>,
  onChunk: (chunk: string) => void,
  onSpecialEvent?: (event: any) => void
) {
  const { chatId, content, userId, chat, chatConfig, chatSettings } = setupData

  // Get previous messages and save user message
  const previousMessages = await getMessagesByChatId(chatId)
  const latestSequenceNumber = await getLatestSequenceNumber(chatId)
  const nextSequenceNumber = latestSequenceNumber + 1

  await createMessageAdmin({
    chat_id: chatId,
    user_id: userId,
    content,
    role: 'user',
    sequence_number: nextSequenceNumber
  })

  // Prepare OpenAI messages
  const openaiMessages: Message[] = [
    ...previousMessages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user', content }
  ]

  // Add Pinecone context if available
  if (chatConfig?.pinecone_index_name) {
    try {
      const documents = await retrieveDocuments(chatConfig.pinecone_index_name, content)
      if (documents && documents.length > 0) {
        const contextFromDocs = formatDocumentsAsContext(documents)
        openaiMessages.unshift({ role: 'system', content: contextFromDocs })
      }
    } catch (retrievalError) {
      console.error('Error during document retrieval:', retrievalError)
    }
  }

  // Stream from OpenAI
  let fullResponse = ''
  const wrappedOnChunk = (chunk: string) => {
    fullResponse += chunk
    onChunk(chunk)
  }

  await generateStreamingChatCompletion(openaiMessages, chatSettings, wrappedOnChunk)

  // Save assistant message
  await createMessageAdmin({
    chat_id: chatId,
    user_id: userId,
    content: fullResponse || 'Sorry, I was unable to generate a response.',
    role: 'assistant',
    sequence_number: nextSequenceNumber + 1
  })

  // Email detection (send as special event if callback provided)
  let emailDetectionResult = null
  try {
    if (fullResponse) {
      const result = await detectEmailRequest(fullResponse, openaiMessages, chatSettings)
      if (result?.success) {
        emailDetectionResult = result.details
        if (onSpecialEvent) {
          onSpecialEvent(emailDetectionResult)
        }
      }
    }
  } catch (error) {
    logger.warn('Error in email detection', { error: error as Error, chatId })
  }

  // User email processing (async, non-blocking)
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
    } catch (error) {
      logger.warn('Error in user email processing', { error: error as Error, chatId })
    }
  })

  return { fullResponse, emailDetectionResult }
}



// Fetch streaming endpoint (primary)
router.post('/:chatId/stream-fetch', authenticateChatAccess, async (req: CustomRequest, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')

  const sendEvent = (data: any) => {
    if (!res.writableEnded) res.write(JSON.stringify(data) + '\n')
  }

  try {
    const setupData = await setupStreamRequest(req)
    sendEvent({ type: 'start' })
    
    const { fullResponse } = await processStream(
      setupData, 
      (chunk) => sendEvent({ type: 'chunk', content: chunk }),
      (specialEvent) => sendEvent(specialEvent)
    )
    
    sendEvent({ type: 'done', fullContent: fullResponse })
    res.end()
  } catch (error) {
    logger.error('Error in fetch streaming', { error: error as Error, chatId: req.params.chatId })
    sendEvent({ type: 'error', error: error instanceof Error ? error.message : 'Internal server error' })
    res.end()
  }
})

// SSE streaming endpoint (fallback)
async function handleSSEStream(req: CustomRequest, res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const sendEvent = (data: any) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
      res.flushHeaders()
    }
  }

  try {
    const setupData = await setupStreamRequest(req)
    sendEvent({ type: 'connected' })
    
    const { fullResponse } = await processStream(
      setupData, 
      (chunk) => sendEvent({ type: 'chunk', content: chunk }),
      (specialEvent) => sendEvent(specialEvent)
    )
    
    sendEvent({ type: 'done', fullContent: fullResponse })
    res.write(':\n\n')
    res.end()
  } catch (error) {
    logger.error('Error in SSE streaming', { error: error as Error, chatId: req.params.chatId })
    sendEvent({ type: 'error', error: error instanceof Error ? error.message : 'Internal server error' })
    res.write(':\n\n')
    res.end()
  }
}

router.post('/:chatId/stream', authenticateChatAccess, handleSSEStream)
router.get('/:chatId/stream', authenticateChatAccess, handleSSEStream)

// Simplified AI SDK streaming endpoint for testing
router.post('/stream', async (req, res) => {
  try {
    const { messages } = req.body;

    // For now, use a simple system prompt
    const systemPrompt = 'You are a helpful assistant. Respond using Markdown formatting.';

    const result = streamText({
      model: openai('gpt-4'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
      providerOptions: {
        openai: {
          reasoning: {
            effort: "minimal"
          },
          stream: true,
          text: {
            format: {
              type: 'text'
            },
            verbosity: "low",
          },
          service_tier: "priority"
        }
      }
    });

    return result.pipeUIMessageStreamToResponse(res);
  } catch (error) {
    logger.error('Error in AI SDK streaming', { error: error as Error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router
