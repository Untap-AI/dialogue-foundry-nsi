import OpenAI from 'openai'
import dotenv from 'dotenv'
import { MAX_MESSAGES_PER_CHAT } from '../db/messages'
import type {
  ResponseCreateParams,
  ResponseFunctionToolCall
} from 'openai/resources/responses/responses.mjs'
import { randomUUID } from 'crypto'

dotenv.config()

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set in environment variables')
}

const openai = new OpenAI({
  apiKey
})

// TODO: Is there a utility type somewhere that we can use for this?
export type Message = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatSettings = {
  model: string
  temperature: number
  systemPrompt: string
  companyId: string
  enableEmailFunction?: boolean
  timezone?: string
  hasUserEmail?: boolean
}

// Default settings to use if none are provided
export const DEFAULT_SETTINGS: Pick<ChatSettings, 'model' | 'temperature'> = {
  model: 'gpt-4.1',
  temperature: 0.5
}

/**
 * Limits the conversation context to the specified maximum number of messages
 * while preserving the most recent conversation history
 */
const limitMessagesContext = (
  messages: Message[],
  maxMessages: number
): Message[] => {
  if (messages.length <= maxMessages) {
    return messages
  }

  // Extract any system messages
  const systemMessages = messages.filter(msg => msg.role === 'system')

  // Get the most recent non-system messages
  const nonSystemMessages = messages
    .filter(msg => msg.role !== 'system')
    .slice(-maxMessages + systemMessages.length)

  // Return system messages first, followed by the most recent non-system messages
  return [...systemMessages, ...nonSystemMessages]
}

/**
 * Main streaming chat completion function - focuses purely on content generation
 * without any tool calls
 */
export const generateStreamingChatCompletion = async (
  messages: Message[],
  settings: ChatSettings,
  onChunk: (chunk: string) => void
): Promise<string> => {
  try {
    // Limit the number of messages to avoid exceeding token limits
    const limitedMessages = limitMessagesContext(
      messages,
      MAX_MESSAGES_PER_CHAT
    )

    // Add email status information to system prompt if applicable
    const emailStatusInfo = settings.hasUserEmail 
      ? '\n\nIMPORTANT: The user has already provided their email address for this conversation. Do not ask for their email again or suggest providing contact information.'
      : ''

    const systemPromptWithCurrentDate = `Respond using Markdown formatting for headings, lists, and emphasis for all answers.\n\n${settings.systemPrompt}${emailStatusInfo}\n\nThe current date and time is ${new Date().toLocaleString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZone: settings.timezone || 'UTC'
      }
    )}.`

    const requestOptions = {
      model: settings.model,
      input: limitedMessages,
      temperature: settings.temperature,
      instructions: systemPromptWithCurrentDate,
      stream: true,
      text: {
        format: {
          type: 'text'
        }
      }
      // Note: No tools are included here - this LLM focuses purely on content generation
    } as const satisfies ResponseCreateParams

    // Create the response with streaming enabled
    const response = await openai.responses.create(requestOptions)

    let fullText = ''

    try {
      for await (const chunk of response) {
        let text = ''

        if (chunk.type === 'response.output_text.delta') {
          text = 'delta' in chunk ? chunk.delta : ''
        }

        if (text.length > 0) {
          fullText += text
          onChunk(text)
        }
      }

      return fullText
    } catch (streamError) {
      console.error('Error during stream processing:', streamError)
      throw streamError
    }
  } catch (error) {
    console.error('Error generating streaming chat completion:', error)
    throw new Error(`Failed to generate streaming response: ${error}`)
  }
}

// Function to handle email function calls from the email detection LLM
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

// Email detection model settings
const EMAIL_DETECTION_MODEL = 'gpt-4.1-mini'
const EMAIL_DETECTION_TEMPERATURE = 0.3

// Tool definition for the email detection LLM
const requestUserEmailTool = {
  type: 'function',
  name: 'request_user_email',
  description:
    'Call this function when the assistant is clearly asking for, requesting, or mentioning that they need the user\'s email address or contact information. This includes direct requests like "What\'s your email?", indirect requests like "I\'d like to follow up with you", or mentions of sending information via email.',
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
    '@'
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
- Directly ask for email address ("What's your email?", "Can you provide your email?")
- Mention following up or contacting later ("I'd like to follow up", "Let me get back to you")
- Offer to send information ("I can send you details", "I'll email you the information")
- Ask for contact information in any form
- Mention needing to reach out or get in touch

IMPORTANT: Only call the function if the assistant is clearly requesting the user's email or contact information. Do not call if they're just mentioning email in general terms or talking about someone else's email.

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
