import OpenAI from 'openai'
import dotenv from 'dotenv'
import {
  isOpenAIResponseDeltaChunk,
  validateOpenAIResponseChunk
} from '../util/openai-chunk-validators'
import { MAX_MESSAGES_PER_CHAT } from '../db/messages'

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
}

// Default settings to use if none are provided
export const DEFAULT_SETTINGS: ChatSettings = {
  // TODO: Assess model performance
  model: 'gpt-4o',
  temperature: 0.7
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

export const generateChatCompletion = async (
  messages: Message[],
  settings: ChatSettings = DEFAULT_SETTINGS
) => {
  try {
    // Limit the number of messages to avoid exceeding token limits
    const limitedMessages = limitMessagesContext(
      messages,
      MAX_MESSAGES_PER_CHAT
    )

    const response = await openai.responses.create({
      model: settings.model,
      input: limitedMessages,
      temperature: settings.temperature,
      instructions: settings.systemPrompt,
      stream: false,
      text: {
        format: {
          type: 'text'
        }
      }
    })

    // Extract the text content from the response
    const outputMessage = response.output.find(
      item => item.type === 'message' && item.role === 'assistant'
    )

    if (outputMessage && 'content' in outputMessage) {
      const textContent = outputMessage.content.find(
        item => item.type === 'output_text'
      )

      if (textContent && 'text' in textContent) {
        return textContent.text
      }
    }

    throw new Error('No valid response content found')
  } catch (error) {
    console.error('Error generating chat completion:', error)
    throw new Error(`Failed to generate response: ${error}`)
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

    // Create the response with streaming enabled
    const response = await openai.responses.create({
      model: settings.model,
      input: limitedMessages,
      temperature: settings.temperature,
      instructions: settings.systemPrompt,
      stream: true,
      text: {
        format: {
          type: 'text'
        }
      }
    })

    let fullText = ''

    try {
      for await (const rawChunk of response) {
        // Use our validator instead of type casting
        const chunk = validateOpenAIResponseChunk(rawChunk)

        let text = ''

        // Use our type guard function instead of checking the type directly
        if (isOpenAIResponseDeltaChunk(chunk)) {
          text = chunk.delta
        }

        if (text) {
          // Add to full text and send immediately
          fullText += text
          onChunk(text)
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
