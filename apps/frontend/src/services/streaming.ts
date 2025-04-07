import { DEFAULT_TOKEN_STORAGE_KEY, DEFAULT_CHAT_ID_STORAGE_KEY } from './api'
import type { ChatConfig } from './api'

// Define the SSE event types for TypeScript
interface SSEMessageEvent extends MessageEvent {
  data: string;
}

interface SSEEventData {
  type: 'connected' | 'chunk' | 'done' | 'error';
  content?: string;
  fullContent?: string;
  error?: string;
  code?: string;
}

export class ChatStreamingService {
  private apiBaseUrl: string
  private companyId: string
  private tokenStorageKey: string
  private chatIdStorageKey: string
  private storage: Storage
  private eventSource: EventSource | undefined = undefined
  private isReconnecting: boolean = false
  private reconnectAttempts: number = 0
  private lastReconnectTime: number = 0
  private tokenReconnectAttempts: number = 0  // Add counter specifically for token errors
  private readonly MAX_RECONNECT_ATTEMPTS: number = 3
  private readonly MAX_TOKEN_RECONNECT_ATTEMPTS: number = 1  // Limit token reconnection to 1 attempt
  private readonly RECONNECT_RESET_TIME: number = 10 * 60 * 1000 // 10 minutes in ms

  constructor(config: ChatConfig) {
    this.apiBaseUrl = config.apiBaseUrl
    this.companyId = config.companyId
    this.tokenStorageKey = config.tokenStorageKey || DEFAULT_TOKEN_STORAGE_KEY
    this.chatIdStorageKey =
      config.chatIdStorageKey || DEFAULT_CHAT_ID_STORAGE_KEY
    this.storage = localStorage
  }

  /**
   * Initialize a new chat session
   * @param companyId Optional company ID to associate with the chat
   * @returns Promise resolving to the new chat ID
   */
  async initializeNewChat(): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'New Chat',
          companyId: this.companyId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store the new token and chat ID
      this.storage.setItem(this.tokenStorageKey, data.accessToken);
      this.storage.setItem(this.chatIdStorageKey, data.chat.id);
      
      return data.chat.id;
    } catch (error) {
      console.error('Failed to initialize new chat:', error);
      throw error;
    }
  }

  /**
   * Reset reconnection counters if sufficient time has passed
   */
  private checkAndResetReconnectCounters(): void {
    const now = Date.now();
    // If it's been more than the reset time since the last reconnect attempt, reset counters
    if (now - this.lastReconnectTime > this.RECONNECT_RESET_TIME) {
      this.reconnectAttempts = 0;
      this.tokenReconnectAttempts = 0;  // Also reset token reconnect attempts
    }
  }

  /**
   * Stream a message to the chat using SSE (Server-Sent Events)
   * @param content User message content
   * @param onChunk Callback for each message chunk
   * @param onComplete Callback for when the stream completes
   * @param onError Callback for when an error occurs
   * @param companyId Optional company ID for initializing a new chat if needed
   */
  async streamMessage(
    content: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): Promise<void> {
    // Reset reconnection counters if it's been a while
    this.checkAndResetReconnectCounters();
    
    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      onError(new Error(
        `Too many reconnection attempts. Please reload the page to continue. (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`
      ));
      return;
    }

    let chatId = this.storage.getItem(this.chatIdStorageKey)
    let token = this.storage.getItem(this.tokenStorageKey)

    // If we're missing the chat ID or token, try to initialize a new chat
    if (!chatId || !token) {
      try {
        if (!this.isReconnecting) {
          console.log('No chat session found. Initializing a new chat...');
          await this.initializeNewChat();
          chatId = this.storage.getItem(this.chatIdStorageKey);
          token = this.storage.getItem(this.tokenStorageKey);
        } else {
          // We're already trying to reconnect but still no token/chatId
          onError(new Error('Failed to initialize chat session'));
          return;
        }
      } catch (initError) {
        onError(new Error('Failed to initialize chat session'));
        return;
      }
    }

    // Close any existing EventSource
    this.cancelStream();

    // Create the URL with query parameters for token and content
    const url = new URL(`${this.apiBaseUrl}/chats/${chatId}/stream`);
    url.searchParams.append('content', content);
    // Ensure token is not null before appending
    if (token) {
      url.searchParams.append('token', token);
    }
    
    try {
      // Create a new EventSource connection
      this.eventSource = new EventSource(url.toString());
      
      let fullText = '';
      
      // Handle incoming messages
      this.eventSource.onmessage = (event: SSEMessageEvent) => {
        try {
          const data = JSON.parse(event.data) as SSEEventData;
          
          switch (data.type) {
            case 'connected':
              console.log('SSE connection established');
              break;
              
            case 'chunk':
              // Handle the content - we've verified it's a string
              if (typeof data.content === 'string') {
                const content = data.content as string;
                fullText += content;
                onChunk(content);
              }
              break;
              
            case 'done':
              // Use the full content from the server if available
              if (typeof data.fullContent === 'string') {
                // Ensure the UI has time to process any final chunks
                setTimeout(() => {
                  onComplete(data.fullContent as string);
                  this.closeEventSource();
                }, 100); // Increased timeout to ensure all chunks are processed
              } else {
                // Make sure we got everything by waiting a short delay
                setTimeout(() => {
                  onComplete(fullText);
                  this.closeEventSource();
                }, 100); // Increased timeout to ensure all chunks are processed
              }
              // Reset reconnect attempts on successful completion
              this.reconnectAttempts = 0;
              break;
              
            case 'error':
              // Check if this is a token error
              if (data.code === 'TOKEN_INVALID' || data.code === 'TOKEN_MISSING') {
                this.handleTokenError(content, onChunk, onComplete, onError, companyId);
              } else {
                onError(new Error(data.error || 'Unknown streaming error'));
                this.closeEventSource();
              }
              break;
              
            default:
              console.warn('Unknown event type:', data.type);
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
          onError(new Error('Failed to parse server response'));
          this.closeEventSource();
        }
      };    
    } catch (error) {
      onError(
        error instanceof Error ? error : new Error('Failed to setup streaming connection')
      );
      this.closeEventSource();
    }
  }

  /**
   * Calculate exponential backoff time based on retry attempts
   */
  private getBackoffTime(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000); // Max 10 seconds
  }

  /**
   * Handle token errors by reinitializing the chat and retrying
   */
  private async handleTokenError(
    content: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: Error) => void,
    companyId?: string
  ): Promise<void> {
    this.closeEventSource();
    
    // Track reconnection attempt
    this.reconnectAttempts++;
    this.tokenReconnectAttempts++;  // Increment token-specific counter
    this.lastReconnectTime = Date.now();
    
    // Check if we've exceeded maximum token reconnection attempts (limit to 1)
    if (this.tokenReconnectAttempts > this.MAX_TOKEN_RECONNECT_ATTEMPTS) {
      onError(new Error(`Authentication token is invalid. Only one retry attempt is allowed. Please reload the page to continue.`));
      this.isReconnecting = false;
      return;
    }
    
    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
      onError(new Error(`Too many general reconnection attempts (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}). Please reload the page to continue.`));
      this.isReconnecting = false;
      return;
    }
    
    if (this.isReconnecting) {
      // Avoid nested reconnection loops
      onError(new Error(`Authentication already in progress. Please reload the page and try again.`));
      this.isReconnecting = false;
      return;
    }
    
    console.log(`Token expired or invalid. Reinitializing chat... Attempt ${this.tokenReconnectAttempts}/${this.MAX_TOKEN_RECONNECT_ATTEMPTS}`);
    this.isReconnecting = true;
    
    try {
      // Calculate backoff time for exponential retry
      const backoffTime = this.getBackoffTime();
      console.log(`Waiting ${backoffTime}ms before reconnecting...`);
      
      // Wait for backoff time before retrying
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      // Clear existing token and chat ID
      this.storage.removeItem(this.tokenStorageKey);
      this.storage.removeItem(this.chatIdStorageKey);
      
      // Initialize a new chat (don't pass companyId as it's already a class member)
      await this.initializeNewChat();
      
      // Retry the streaming request
      console.log('Reconnecting with new chat session...');
      await this.streamMessage(content, onChunk, onComplete, onError, companyId);
      this.isReconnecting = false;
    } catch (error) {
      console.error('Failed to reinitialize chat:', error);
      onError(new Error(`Failed to automatically renew your session. Please reload the page. (Token attempt ${this.tokenReconnectAttempts}/${this.MAX_TOKEN_RECONNECT_ATTEMPTS})`));
      this.isReconnecting = false;
    }
  }

  /**
   * Close the EventSource connection
   */
  private closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  /**
   * Cancel ongoing stream if one exists
   */
  cancelStream(): void {
    this.closeEventSource();
  }
  
  /**
   * Reset reconnection state and counters
   * Call this when the user manually reloads or takes action to resolve issues
   */
  resetReconnectionState(): void {
    this.reconnectAttempts = 0;
    this.tokenReconnectAttempts = 0;  // Also reset token reconnect attempts
    this.lastReconnectTime = 0;
    this.isReconnecting = false;
  }
}
