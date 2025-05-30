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
  systemPrompt: string // Add systemPrompt as an optional parameter
  companyId: string // Company ID for context in function calls
  enableEmailFunction?: boolean // Whether to enable the email function
  timezone?: string // User's timezone
}

// Default settings to use if none are provided
export const DEFAULT_SETTINGS: Pick<ChatSettings, 'model' | 'temperature'> = {
  model: 'gpt-4.1',
  temperature: 0.5
}

// New tool: request_user_email
const requestUserEmailTool = {
  type: 'function',
  name: 'request_user_email',
  // TODO: Make this description more comprehensive
  description:
    'Request the user to provide their email address. Use this when you need to collect the user\'s email for further assistance or follow-up, but do not send the email yet.',
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

// Function to handle email function calls from OpenAI
const handleFunctionCall = async (
  functionCall: ResponseFunctionToolCall,
  onSpecialEvent?: (event: any) => void // Optional callback for special events
): Promise<{ success: boolean; details?: any }> => {


  if (functionCall.name === 'request_user_email') {
    // Instead of sending an email, stream a special event to the frontend
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
    details: { error: 'NO_FUNCTION_CALLS' }
  }
}

// Helper function to generate a follow-up response after a function call
const generateFollowUpResponse = (
  functionName: string,
  onChunk: (chunk: string) => void,
  updateFullText: (text: string) => void
): void => {
  // Create a simple follow-up response based on the function call result
  let responseText = ''

  // Handle different function types - currently we only have email, but this makes it extensible
  switch (functionName) {
    case 'request_user_email':
      // TODO: Make this dynamic with separate requests to the LLM
      responseText = 'Would you like to provide your email address for follow-up?'
  }

  // Stream the response back to the client by sending it in small chunks
  const chunkSize = 10 // Characters per chunk
  let startIndex = 0

  // Function to stream text in chunks with a delay
  const streamTextChunks = () => {
    while (startIndex < responseText.length) {
      const endIndex = Math.min(startIndex + chunkSize, responseText.length)
      const chunk = responseText.substring(startIndex, endIndex)

      // Send this chunk to the client
      onChunk(chunk)

      // Move to the next chunk
      startIndex = endIndex
    }
  }

  // Start streaming the text chunks
  streamTextChunks()

  // Add the full response text to the tracking variable
  updateFullText(responseText)
}

export const generateStreamingChatCompletion = async (
  messages: Message[],
  settings: ChatSettings,
  onChunk: (chunk: string) => void,
  onSpecialEvent?: (event: any) => void // New callback for special events
) => {
  // TODO: Implement token checking and context cutoff
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
      },
      ...(settings.enableEmailFunction ? { tools: [requestUserEmailTool] } : {})
    } as const satisfies ResponseCreateParams

    // Create the response with streaming enabled
    const response = await openai.responses.create(requestOptions)

    let fullText = ''
    const functionCalls: ResponseFunctionToolCall[] = []

    try {
      for await (const chunk of response) {
        let text = ''

        // Use our type guard function instead of checking the type directly
        if (chunk.type === 'response.output_text.delta') {
          text = 'delta' in chunk ? chunk.delta : ''
        }

        // Check if this chunk contains function calls
        if (
          chunk.type === 'response.output_item.done' &&
          chunk.item.type === 'function_call'
        ) {
          functionCalls.push(chunk.item)
          // We'll handle function calls after streaming completes
        }

        if (text.length > 0) {
          // Add to full text and send immediately
          fullText += text
          onChunk(text)
        }
      }

      // Process function calls after streaming completes if detected
      if (functionCalls.length > 0) {
        await Promise.all(
          functionCalls.map(async functionCall => {
            // Process the function call
            await handleFunctionCall(
              functionCall,
              onSpecialEvent // Pass the callback
            )

              generateFollowUpResponse(
                functionCall.name,
                onChunk,
                text => {
                  fullText += text
                }
              )
          })
        )
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
