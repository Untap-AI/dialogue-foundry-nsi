import OpenAI from 'openai'
import dotenv from 'dotenv'
import {
  isOpenAIResponseDeltaChunk,
  validateOpenAIResponseChunk
} from '../util/openai-chunk-validators'
import { MAX_MESSAGES_PER_CHAT } from '../db/messages'
import { sendInquiryEmail, EmailData } from './sendgrid-service'
import { ResponseCreateParams } from 'openai/resources/responses/responses.mjs'

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
  systemPrompt?: string // Add systemPrompt as an optional parameter
  companyId?: string // Company ID for context in function calls
  enableEmailFunction?: boolean // Whether to enable the email function
}

// Default settings to use if none are provided
export const DEFAULT_SETTINGS: ChatSettings = {
  // TODO: Assess model performance
  model: 'gpt-4o-mini',
  temperature: 0.7
}

// Define the email tool for OpenAI function calling
const emailTool = {
  type: 'function',
    name: 'send_email',
    description: 'Send an email to the company with user contact information and conversation details. This should only be used if the user has explicitly consented to sending an email and provided their email address.',
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'The subject of the email'
        },
        userEmail: {
          type: 'string',
          description: 'The email address of the user to contact them'
        },
        conversationSummary: {
          type: 'string',
          description: 'A brief summary of what the user is looking for or needs help with'
        }
      },
      required: ['userEmail', 'conversationSummary', 'subject'],
      additionalProperties: false,
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
const handleFunctionCalls = async (
  functionCalls: any[],
  messages: Message[],
  companyId?: string
): Promise<{ success: boolean; message: string }> => {
  for (const functionCall of functionCalls) {
    if (functionCall.name === 'send_email') {
      try {
        const args = JSON.parse(functionCall.arguments)
        
        // Only proceed if we have an email to contact
        if (!args.userEmail) {
          return {
            success: false,
            message: 'User email is required to send an email'
          }
        }
        
        // Get recent messages for context (last 5 messages)
        const recentMessages = messages.slice(-20)
        
        // Prepare email data
        const emailData: EmailData = {
          userEmail: args.userEmail,
          conversationSummary: args.conversationSummary,
          recentMessages,
          companyId: companyId || 'default'
        }
        
        // Send the email
        const emailSent = await sendInquiryEmail(emailData)
        
        if (emailSent) {
          return {
            success: true,
            message: 'Email sent successfully'
          }
        } else {
          return {
            success: false,
            message: 'Failed to send email'
          }
        }
      } catch (error) {
        console.error('Error processing email function call:', error)
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      }
    }
  }
  
  return {
    success: false,
    message: 'No email function calls found'
  }
}

export const generateStreamingChatCompletion = async (
  messages: Message[],
  settings: ChatSettings = DEFAULT_SETTINGS,
  onChunk: (chunk: string) => void
) => {
  // TODO: Implement token checking and context cutoff
  // TODO: Implement rate limiting
  try {
    // Limit the number of messages to avoid exceeding token limits
    const limitedMessages = limitMessagesContext(
      messages,
      MAX_MESSAGES_PER_CHAT
    )
    
    // Configure request options with tools if email function is enabled
    const requestOptions = {
      model: settings.model,
      input: limitedMessages,
      temperature: settings.temperature,
      instructions: settings.systemPrompt,
      stream: true,
      text: {
        format: {
          type: 'text'
        }
      },
      ...(settings.enableEmailFunction ? { tools: [emailTool] } : {})
    } as const satisfies ResponseCreateParams
    
    // Create the response with streaming enabled
    const response = await openai.responses.create(requestOptions)

    let fullText = ''
    let functionCalls = []

    try {
      for await (const rawChunk of response) {
        // Use our validator instead of type casting
        const chunk = validateOpenAIResponseChunk(rawChunk)

        let text = ''

        // Use our type guard function instead of checking the type directly
        if (isOpenAIResponseDeltaChunk(chunk)) {
          console.log('chunk', chunk)
          text = chunk.delta
        }
        
        // Check if this chunk contains function calls
        if (
          'chunk' in chunk &&
          chunk.type === 'function_call'
        ) {
          functionCalls.push(chunk)
          // We'll handle function calls after streaming completes
        }

        if (text) {
          // Add to full text and send immediately
          fullText += text
          onChunk(text)
        }
      }
      
      // Process function calls after streaming completes if detected
      if (functionCalls.length > 0) {
          const result = await handleFunctionCalls(
            functionCalls,
            messages,
            settings.companyId
          )

          // TODO: Return success message from result
          
          if (result.success) {
            // Send a message indicating email was sent
            // TODO: Change this
            const emailSentMessage = '\n\n[Email has been sent successfully]'
            onChunk(emailSentMessage)
            fullText += emailSentMessage
          }
      }

      // Add a small delay to ensure all content is properly processed by the client
      await new Promise(resolve => setTimeout(resolve, 50))

      // Send a final empty chunk to ensure proper completion
      onChunk('')

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
