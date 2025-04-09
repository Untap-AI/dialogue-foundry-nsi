import OpenAI from 'openai'
import dotenv from 'dotenv'
import {
  isOpenAIResponseDeltaChunk,
  OpenAIResponseChunk,
  validateOpenAIResponseChunk
} from '../util/openai-chunk-validators'
import { MAX_MESSAGES_PER_CHAT } from '../db/messages'
import { sendInquiryEmail, EmailData } from './sendgrid-service'
import { ResponseCreateParams, ResponseFunctionToolCall, ResponseOutputItemAddedEvent } from 'openai/resources/responses/responses.mjs'

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
  functionCalls: ResponseFunctionToolCall[],
  messages: Message[],
  companyId?: string
): Promise<{ success: boolean; message: string; details?: any }> => {
  for (const functionCall of functionCalls) {
    if (functionCall.name === 'send_email') {
      try {
        // Parse arguments with validation
        if (!functionCall.arguments) {
          console.error('Function arguments are empty');
          return {
            success: false,
            message: 'Email function arguments are empty',
            details: { error: 'MISSING_ARGUMENTS' }
          };
        }
        
        const args = JSON.parse(functionCall.arguments);
        console.log('Parsed email arguments:', args);
        
        // Validate required fields
        if (!args.userEmail) {
          console.error('User email is required to send an email');
          return {
            success: false,
            message: 'User email is required to send an email',
            details: { error: 'MISSING_EMAIL' }
          };
        }

        if (!args.conversationSummary) {
          console.error('Conversation summary is required to send an email');
          return {
            success: false,
            message: 'Conversation summary is required',
            details: { error: 'MISSING_SUMMARY' }
          };
        }
        
        // Get recent messages for context (limited to last 20 messages)
        const recentMessages = messages.slice(-20).filter(msg => msg.role !== 'system');
        
        // Prepare email data
        const emailData: EmailData = {
          userEmail: args.userEmail,
          conversationSummary: args.subject ? `${args.subject}: ${args.conversationSummary}` : args.conversationSummary,
          recentMessages,
          companyId: companyId || 'default'
        };
        
        console.log(`Attempting to send email for company ID: ${companyId || 'default'}`);
        
        // Send the email
        const emailSent = await sendInquiryEmail(emailData);
        
        if (emailSent) {
          console.log('Email sent successfully');
          return {
            success: true,
            message: 'Email sent successfully',
            details: { userEmail: args.userEmail }
          };
        } else {
          console.error('Failed to send email via SendGrid');
          return {
            success: false,
            message: 'Failed to send email via email service',
            details: { error: 'EMAIL_SERVICE_FAILURE' }
          };
        }
      } catch (error) {
        console.error('Error processing email function call:', error);
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : String(error)}`,
          details: { error: 'PROCESSING_ERROR' }
        };
      }
    }
  }
  
  return {
    success: false,
    message: 'No supported function calls found',
    details: { error: 'NO_FUNCTION_CALLS' }
  };
};

// Helper function to generate a follow-up response after a function call
const generateFollowUpResponse = (
  functionName: string,
  functionCallResult: { success: boolean; message: string; details?: any },
  onChunk: (chunk: string) => void,
  updateFullText: (text: string) => void
): void => {
  // Create a simple follow-up response based on the function call result
  let responseText = "";
  
  // Handle different function types - currently we only have email, but this makes it extensible
  switch(functionName) {
    case 'send_email':
      if (functionCallResult.success) {
        responseText = `\n\nThank you! Your email has been sent. Someone from the team will get back to you soon. Is there anything else I can help you with in the meantime?`;
      } else {
        // Customize error message based on the error details
        const errorType = functionCallResult.details?.error || 'UNKNOWN';
        
        switch (errorType) {
          case 'MISSING_EMAIL':
            responseText = `\n\nI wasn't able to send your email because I didn't receive a valid email address. Could you please provide your email address so I can help you contact the vineyard?`;
            break;
          case 'MISSING_SUMMARY':
            responseText = `\n\nI need a brief summary of your inquiry to send to the vineyard. Could you please tell me what you'd like to ask or discuss with them?`;
            break;
          case 'EMAIL_SERVICE_FAILURE':
            responseText = `\n\nI apologize, but there seems to be a technical issue with our email service at the moment. You can reach out to the vineyard directly through their website. Is there something else I can help you with?`;
            break;
          default:
            responseText = `\n\nI wasn't able to send your email at this time. You can reach out to the vineyard directly. Is there something else I can help you with today?`;
        }
      }
      break;
      
    // Can add more function types here in the future
    default:
      if (functionCallResult.success) {
        responseText = `\n\nI've processed your request successfully. What else would you like to know?`;
      } else {
        responseText = `\n\nI wasn't able to process your request at this time. Is there something else I can help you with?`;
      }
  }
  
  console.log(`Sending follow-up response: ${responseText}`);
  
  // Add the full response text to the tracking variable
  updateFullText(responseText);
  
  // Stream the response back to the client by sending it in small chunks
  const chunkSize = 10; // Characters per chunk
  let startIndex = 0;
  
  // Function to stream text in chunks with a delay
  const streamTextChunks = () => {
    while(startIndex < responseText.length) {
      const endIndex = Math.min(startIndex + chunkSize, responseText.length);
      const chunk = responseText.substring(startIndex, endIndex);
      
      // Send this chunk to the client
      onChunk(chunk);
      
      // Move to the next chunk
      startIndex = endIndex;
    }
  };
  
  // Start streaming the text chunks
  streamTextChunks();
};

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
    let functionCalls: ResponseFunctionToolCall[] = []

    try {
      for await (const chunk of response) {
        let text = ''

        console.log('chunk', chunk)

        // Use our type guard function instead of checking the type directly
        if (chunk.type === 'response.output_text.delta') {
          console.log('delta', chunk)
          text = 'delta' in chunk ? chunk.delta : ''
        }
        
        // Check if this chunk contains function calls
        if (
          chunk.type === 'response.output_item.done'
          && chunk.item.type === 'function_call'
        ) {
          console.log('function call detected:', chunk.item);
          functionCalls.push(chunk.item);
          // We'll handle function calls after streaming completes
        }

        if (text) {
          // Add to full text and send immediately
          fullText += text;
          onChunk(text);
        }
      }
      
      // Process function calls after streaming completes if detected
      if (functionCalls.length > 0) {
          console.log(`Processing ${functionCalls.length} function calls`);
          const functionCall = functionCalls[0]; // Get the first function call
          let functionCallDetails: any = {};
          
          try {
            // Parse the function call arguments if available
            if (functionCall && 'arguments' in functionCall) {
              functionCallDetails = JSON.parse(functionCall.arguments as string);
              console.log('Parsed function call details:', functionCallDetails);
            }
          } catch (error) {
            console.error('Error parsing function call arguments:', error);
          }
          
          // Process the function call
          const result = await handleFunctionCalls(
            functionCalls,
            messages,
            settings.companyId
          );
          
          // Generate and stream a simple follow-up response
          generateFollowUpResponse(
            functionCall.name,
            result,
            onChunk,
            (text) => { fullText += text; }
          );
      }

      // Add a small delay to ensure all content is properly processed by the client
      await new Promise(resolve => setTimeout(resolve, 100))

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
