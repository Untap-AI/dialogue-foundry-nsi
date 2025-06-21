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

    const systemPromptWithCurrentDate = `Respond using Markdown formatting for headings, lists, and emphasis for all answers.\n\n${settings.systemPrompt}\n\nThe current date and time is ${new Date().toLocaleString(
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
const EMAIL_DETECTION_MODEL = 'gpt-4.1-nano'
const EMAIL_DETECTION_TEMPERATURE = 0.1

// Tool definition for the email detection LLM
const requestUserEmailTool = {
  type: 'function',
  name: 'request_user_email',
  description:
    'Analyze the assistant\'s response and recent conversation context to determine if the assistant is requesting the user\'s email address or contact information. If the assistant asked for or requested the user\'s email address or contact information you should call the request_user_email function.',
  parameters: {
    type: 'object',
    properties: {
      subject: {
        type: 'string',
        description: 'The subject or reason for requesting the email.'
      },
      conversationSummary: {
        type: 'string',
        description: 'A brief summary of what the user is looking for or needs help with.'
      }
    },
    required: ['conversationSummary', 'subject'],
    additionalProperties: false
  },
  strict: true
} as const satisfies NonNullable<ResponseCreateParams['tools']>[number]

/**
 * Email detection function using a smaller, specialized LLM
 * Analyzes the assistant's response to determine if it asked for user email
 */
export const detectEmailRequest = async (
  assistantResponse: string,
  conversationContext: Message[],
  settings: ChatSettings,
  onSpecialEvent?: (event: any) => void
): Promise<void> => {
  // Only proceed if email function is enabled
  if (!settings.enableEmailFunction) {
    return
  }

  // Early return if the assistant response doesn't contain the word "email"
  // This avoids unnecessary LLM calls when email detection is clearly not needed
  if (!assistantResponse.toLowerCase().includes('email')) {
    return
  }

  try {
    // Create a focused prompt for email detection
    const emailDetectionPrompt = `You are an email request detection system. Your job is to analyze an assistant's response and determine if the assistant asked the user for their email address or contact information.

Analyze the following assistant response and recent conversation context to determine if the assistant is requesting the user's email.

Recent conversation context:
${conversationContext
  .slice(-5) // Last 5 messages for context
  .map(msg => `${msg.role}: ${msg.content}`)
  .join('\n')}

Assistant's latest response:
${assistantResponse}

If the assistant asked for or requested the user's email address, contact information, or indicated they would follow up via email, you should call the request_user_email function.

When calling the function, provide:
- subject: A brief reason why the email is being requested
- conversationSummary: A concise summary of what the user needs help with

Only call the function if you are confident the assistant explicitly asked the user for email contact information.`

    const requestOptions = {
      model: EMAIL_DETECTION_MODEL,
      input: [
        {
          role: 'user',
          content: emailDetectionPrompt
        }
      ],
      temperature: EMAIL_DETECTION_TEMPERATURE,
      instructions: 'You are a precise email request detection system. Only call the function when you are certain the assistant requested contact information.',
      tools: [requestUserEmailTool]
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
        chunk.item.type === 'function_call'
      ) {
        await handleEmailDetectionFunctionCall(chunk.item, onSpecialEvent)
      }
    }
  } catch (error) {
    console.error('Error in email detection:', error)
    // Don't throw - email detection failure shouldn't break the main flow
  }
}
