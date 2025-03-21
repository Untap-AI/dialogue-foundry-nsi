import OpenAI from 'openai'
import dotenv from 'dotenv'
import {
  isOpenAIResponseDeltaChunk,
  validateOpenAIResponseChunk
} from '../util/openai-chunk-validators'

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
}

// Default settings to use if none are provided
export const DEFAULT_SETTINGS: ChatSettings = {
  // TODO: Assess model performance
  model: 'gpt-4o',
  temperature: 0.7
}

export const generateChatCompletion = async (
  messages: Message[],
  settings: ChatSettings = DEFAULT_SETTINGS
) => {
  try {
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system')
    const otherMessages = messages.filter(msg => msg.role !== 'system')

    const response = await openai.responses.create({
      model: settings.model,
      input: otherMessages,
      temperature: settings.temperature,
      instructions: systemMessage?.content ?? '',
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
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === 'system')
    const otherMessages = messages.filter(msg => msg.role !== 'system')

    // Create the response with streaming enabled
    const response = await openai.responses.create({
      model: settings.model,
      input: otherMessages,
      temperature: settings.temperature,
      // TODO: Change how we do instructions here
      instructions: systemMessage?.content ?? '',
      stream: true,
      text: {
        format: {
          type: 'text'
        }
      }
    })

    let fullText = ''

    for await (const rawChunk of response) {
      // Use our validator instead of type casting
      const chunk = validateOpenAIResponseChunk(rawChunk)

      let text = ''

      // Use our type guard function instead of checking the type directly
      if (isOpenAIResponseDeltaChunk(chunk)) {
        text = chunk.delta
      }

      if (text) {
        onChunk(text)
      }

      fullText += text
    }

    return fullText
  } catch (error) {
    console.error('Error generating streaming chat completion:', error)
    throw new Error(`Failed to generate streaming response: ${error}`)
  }
}
