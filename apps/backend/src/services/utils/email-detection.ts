import OpenAI from 'openai'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import type {
  ResponseCreateParams,
  ResponseFunctionToolCall
} from 'openai/resources/responses/responses.mjs'
import type { Message, ChatSettings } from '../openai-service'
import { sendInquiryEmail } from '../sendgrid-service'
import { updateChatUserEmailAdmin } from '../../db/chats'
import { getMessagesByChatId } from '../../db/messages'
import { cacheService } from '../cache-service'
import { logger } from '../../lib/logger'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey
})

// Email detection model settings
const EMAIL_DETECTION_MODEL = 'gpt-4.1'
const EMAIL_DETECTION_TEMPERATURE = 0.3

// Tool definition for the email detection LLM
const requestUserEmailTool = {
  type: 'function',
  name: 'request_user_email',
  description:
    'Call this function when the assistant is clearly asking for, requesting, or mentioning that they need the user\'s email address or contact information.',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'The subject or reason why the email is being requested (e.g., "follow up", "send information", "contact later").'
      },
      conversationSummary: {
        type: 'string',
        description: 'A brief summary of what the user is looking for or needs help with based on the conversation context.'
      }
    },
    required: ['conversationSummary', 'subject'],
    additionalProperties: false
  },
  strict: true
} as const satisfies NonNullable<ResponseCreateParams['tools']>[number]

// Tool definition for generating email summary when user provides email directly
const generateEmailSummaryTool = {
  type: 'function',
  name: 'generate_email_summary',
  description: 'Generate a subject line and conversation summary for an email inquiry when a user has provided their email address.',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'A concise subject line for the email inquiry (under 50 characters) that describes what the user needs help with.'
      },
      conversationSummary: {
        type: 'string',
        description: 'A brief summary of what the user is looking for or needs assistance with based on the conversation (under 200 characters).'
      }
    },
    required: ['subject', 'conversationSummary'],
    additionalProperties: false
  },
  strict: true
} as const satisfies NonNullable<ResponseCreateParams['tools']>[number]

/**
 * Detects if a user message contains an email address
 */
export const detectUserEmailInMessage = (message: string): string | null => {
  // More comprehensive email regex that handles various formats
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = message.match(emailRegex)
  
  if (matches && matches.length > 0) {
    // Return the first email found
    return matches[0]
  }
  
  return null
}

/**
 * Function to handle email function calls from the email detection LLM
 */
const handleEmailDetectionFunctionCall = async (
  functionCall: ResponseFunctionToolCall,
  onSpecialEvent?: (event: any) => void
): Promise<{ success: boolean; details?: any }> => {
  if (functionCall.name === 'request_user_email') {
    // Emit the special event to trigger email input UI
    if (onSpecialEvent && functionCall.arguments) {
      const args = JSON.parse(functionCall.arguments)
      onSpecialEvent({
        type: 'request_email',
        details: args,
        id: randomUUID()
      })
    }
    return {
      success: true,
      details: { requested: true }
    }
  }

  return {
    success: false,
    details: { error: 'UNKNOWN_FUNCTION_CALL' }
  }
}

/**
 * Email detection function using a specialized LLM
 * Analyzes the assistant's response to determine if it asked for user email
 */
export const detectEmailRequest = async (
  assistantResponse: string,
  settings: ChatSettings,
  onSpecialEvent?: (event: any) => void
): Promise<void> => {
  // Only proceed if email function is enabled
  if (!settings.enableEmailFunction) {
    return
  }

  // Expanded early return condition to catch more email-related patterns
  const emailPatterns = [
    'email',
    'contact',
    'follow up',
    'follow-up', 
    'reach out',
    'get in touch',
    'send you',
    'share with you',
    'provide you with',
  ]
  
  const responseText = assistantResponse.toLowerCase()
  const hasEmailIndicator = emailPatterns.some(pattern => responseText.includes(pattern))
  
  if (!hasEmailIndicator) {
    return
  }

  try {
    // Create a focused prompt for email detection with clear examples
    const emailDetectionPrompt = `Analyze the following assistant response to determine if the assistant is asking for or requesting the user's email address or contact information.

Assistant's response:
"${assistantResponse}"

The assistant is requesting email/contact if they:
- Directly ask for email address ("What's your email?", "Can you provide your email?", "would you like to share your email?")
- Ask for contact information from the user in any form

IMPORTANT: Only call the function if the assistant is clearly requesting the user's email or contact information. Do not call if they're just mentioning email in general terms or talking about someone else's email or mentioning that they sent an email already.

If the assistant IS requesting the user's email/contact information, call the request_user_email function with appropriate details.`

    // Debug logging
    console.log('EMAIL DETECTION: Analyzing response:', {
      response: assistantResponse.substring(0, 200) + (assistantResponse.length > 200 ? '...' : ''),
      hasEmailIndicator,
      matchedPatterns: emailPatterns.filter(pattern => responseText.includes(pattern)),
      companyId: settings.companyId
    })

    const requestOptions = {
      model: EMAIL_DETECTION_MODEL,
      input: [
        {
          role: 'user',
          content: emailDetectionPrompt
        }
      ],
      temperature: EMAIL_DETECTION_TEMPERATURE,
      tools: [requestUserEmailTool]
    } as const satisfies ResponseCreateParams

    // Create the response with streaming enabled for function call detection
    const requestOptionsWithStream = {
      ...requestOptions,
      stream: true
    } as const satisfies ResponseCreateParams

    const response = await openai.responses.create(requestOptionsWithStream)

    let functionCalled = false
    // Process the response to look for function calls
    for await (const chunk of response) {
      if (
        chunk.type === 'response.output_item.done' &&
        chunk.item.type === 'function_call'
      ) {
        functionCalled = true
        console.log('EMAIL DETECTION: Function called!', {
          functionName: chunk.item.name,
          arguments: chunk.item.arguments,
          companyId: settings.companyId
        })
        await handleEmailDetectionFunctionCall(chunk.item, onSpecialEvent)
      }
    }

    // Debug log when no function was called
    if (!functionCalled) {
      console.log('EMAIL DETECTION: No function called', {
        response: assistantResponse.substring(0, 200) + (assistantResponse.length > 200 ? '...' : ''),
        companyId: settings.companyId
      })
    }
  } catch (error) {
    console.error('Error in email detection:', error)
    // Don't throw - email detection failure shouldn't break the main flow
  }
}

/**
 * Generates a conversation summary and subject when user provides email directly using structured output
 */
const generateEmailSummaryForUserEmail = async (
  userMessage: string,
  conversationHistory: Message[],
  settings: ChatSettings
): Promise<{ subject: string; conversationSummary: string } | null> => {
  try {
    const prompt = `A user has provided their email address in the following message: "${userMessage}"

Based on this message and the conversation history, you need to generate a subject line and conversation summary for an email inquiry.

Conversation history:
${conversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Call the generate_email_summary function with:
1. A subject line that is concise and describes what the user needs help with (under 50 characters)
2. A conversation summary that explains what the user is looking for or needs assistance with (under 200 characters)`

    console.log('EMAIL SUMMARY GENERATION: Starting', {
      userMessage: userMessage.substring(0, 100) + '...',
      companyId: settings.companyId
    })

    const requestOptions = {
      model: EMAIL_DETECTION_MODEL,
      input: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: EMAIL_DETECTION_TEMPERATURE,
      tools: [generateEmailSummaryTool]
    } as const satisfies ResponseCreateParams

    // Create the response with streaming enabled for function call detection
    const requestOptionsWithStream = {
      ...requestOptions,
      stream: true
    } as const satisfies ResponseCreateParams

    const response = await openai.responses.create(requestOptionsWithStream)

    // Process the response to look for function calls
    for await (const chunk of response) {
      if (
        chunk.type === 'response.output_item.done' &&
        chunk.item.type === 'function_call' &&
        chunk.item.name === 'generate_email_summary'
      ) {
        try {
          const args = JSON.parse(chunk.item.arguments)
          if (args.subject && args.conversationSummary) {
            console.log('EMAIL SUMMARY GENERATION: Success', {
              subject: args.subject,
              conversationSummary: args.conversationSummary.substring(0, 100) + '...',
              companyId: settings.companyId
            })
            return {
              subject: args.subject,
              conversationSummary: args.conversationSummary
            }
          }
        } catch (parseError) {
          console.error('Error parsing email summary function arguments:', parseError)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error generating email summary:', error)
    return null
  }
}

/**
 * Process user email found in message - handles the complete workflow
 */
export const processUserEmailInMessage = async (
  userMessage: string,
  chatId: string,
  conversationHistory: Message[],
  settings: ChatSettings,
  supportEmail: string,
  hasExistingEmail: boolean
): Promise<void> => {
  try {
    // Check if we should process the email
    const userEmail = detectUserEmailInMessage(userMessage)
    if (!userEmail || !supportEmail || hasExistingEmail) {
      return
    }

    logger.info('Processing user email found in message', {
      chatId,
      email: userEmail.substring(0, 3) + '***' // Log partial email for privacy
    })

    // Generate conversation summary and subject using LLM with structured output
    const emailSummary = await generateEmailSummaryForUserEmail(
      userMessage,
      conversationHistory,
      settings
    )

    if (!emailSummary) {
      logger.warn('Failed to generate email summary for user-provided email', {
        chatId
      })
      return
    }

    // Get recent messages for context (last 20, excluding system)
    const messages = await getMessagesByChatId(chatId)
    const recentMessages = messages.slice(-20).filter(msg => msg.role !== 'system')

    // Send the email using existing service
    const emailSent = await sendInquiryEmail({
      userEmail,
      subject: emailSummary.subject,
      conversationSummary: emailSummary.conversationSummary,
      recentMessages,
      companyId: settings.companyId
    })

    if (emailSent) {
      // Update chat record with user's email
      try {
        const updatedChat = await updateChatUserEmailAdmin(chatId, userEmail)
        if (updatedChat) {
          cacheService.setChat(chatId, updatedChat)
        }
        logger.info('Successfully processed user email from message', {
          chatId,
          subject: emailSummary.subject
        })
      } catch (emailUpdateError) {
        logger.error('Error updating chat with user email (non-critical)', {
          error: emailUpdateError as Error,
          chatId
        })
      }
    } else {
      logger.warn('Failed to send email for user-provided email', {
        chatId,
        subject: emailSummary.subject
      })
    }
  } catch (error) {
    logger.error('Error in processUserEmailInMessage (non-critical)', {
      error: error as Error,
      chatId,
      userMessage: userMessage.substring(0, 50) + '...'
    })
  }
} 