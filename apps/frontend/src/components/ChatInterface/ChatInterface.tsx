import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/conversation';
import { Message, MessageContent } from '@/components/message';
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/prompt-input';
import React, { useState } from 'react';
import { Response } from '@/components/response';

import { Loader } from '@/components/loader';
import { useConfig } from '@/contexts/ConfigContext';
import { cn } from '@/lib/utils';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import type { ChatStatus } from '../../hooks/useChatPersistence';
import { EmailInputMessage } from '../EmailInputMessage/EmailInputMessage';
import { Suggestions, Suggestion } from '../suggestion';

// Loading state component
const ChatLoadingState = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-4">
    <Loader size={32} className="text-primary" />
    <div className="text-center space-y-2">
      <h3 className="text-lg font-medium text-foreground">Setting up your chat</h3>
      <p className="text-sm text-muted-foreground">Please wait while we initialize...</p>
    </div>
  </div>
);

// Error state component
const ChatErrorState = () => (
  <div className="flex flex-col items-center justify-center h-full space-y-4 p-8">
    <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
      <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-medium text-foreground">Unable to start chat</h3>
      <p className="text-sm text-muted-foreground">There was a problem initializing the chat. Please refresh the page to try again.</p>
    </div>
  </div>
);

// Stream error banner component
interface StreamErrorBannerProps {
  streamError: string | null;
  onClearError: () => void;
}

const StreamErrorBanner = ({ streamError, onClearError }: StreamErrorBannerProps) => {
  if (!streamError) return null;
  
  return (
    <div className="mx-4 my-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
      <div className="flex items-start space-x-3">
        <svg className="size-4 text-destructive mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-destructive font-medium">Message failed to send</p>
          <p className="text-xs text-destructive/80 mt-1">Please try sending your message again.</p>
        </div>
        <button
          onClick={onClearError}
          className="text-destructive/60 hover:text-destructive transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

interface ChatInterfaceProps {
  onNewChatRequest?: () => void;
  onChatStatusChange?: (status: ChatStatus) => void;
}

// Create a ref interface for exposing methods to parent
export interface ChatInterfaceRef {
  createNewChat: () => Promise<void>;
}



export const ChatInterface = React.forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ onChatStatusChange }, _ref) => {
  const { poweredBy, suggestions: configSuggestions } = useConfig()
  const [input, setInput] = useState('');

  const showPoweredBy = poweredBy?.show ?? true
  const poweredByText = poweredBy?.text ?? 'Untap AI'
  const poweredByUrl = poweredBy?.url ?? 'https://untap-ai.com'
  
  // Use the chat persistence hook
  const {
    messages,
    sendMessage,
    status,
    chatStatus,
    streamError,
    clearStreamError,
    submitEmailForToolCall,
    recordLinkClick,
    recordConversationStarterClick,
  } = useChatPersistence();

  const isInitialized = chatStatus === 'initialized'

  // Notify parent of chat status changes
  React.useEffect(() => {
    onChatStatusChange?.(chatStatus)
  }, [chatStatus, onChatStatusChange])

  // Determine if we should show suggestions (only when there are no user messages)
  const hasUserMessages = messages.some(message => message.role === 'user')
  const shouldShowSuggestions = isInitialized && !hasUserMessages && configSuggestions && configSuggestions.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isInitialized) {
      sendMessage({
        text: input,
      });
      setInput('');
    }
  };

  // Handle suggestion clicks - send the prompt, not the label
  const handleSuggestionClick = (prompt: string) => {
    if (isInitialized) {
      sendMessage({
        text: prompt,
      });
    }
  };

  // Handle email submission for tool calls
  // const handleEmailSubmit = async (email: string) => {
  //   if (!emailRequest) return;
    
  //   setIsSubmittingEmail(true);
  //   try {
  //     await submitEmailForToolCall(email);
  //   } catch (error) {
  //     console.error('Failed to submit email:', error);
  //     // Could show an error message here
  //   } finally {
  //     setIsSubmittingEmail(false);
  //   }
  // };

  // Show loading state when initializing
  if (chatStatus === 'loading') {
    return (
      <>
        <ChatLoadingState />
        {showPoweredBy && (
          <div className={cn(
            "text-center text-[11px] leading-[11px] text-primary-foreground py-[3px] px-0 bg-primary"
          )}>
            Powered by{' '}
            <a
              href={poweredByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit underline"
            >
              {poweredByText}
            </a>
          </div>
        )}
      </>
    );
  }

  // Show error state when chat failed to initialize
  if (chatStatus === 'error') {
    return (
      <>
        <ChatErrorState />
        {showPoweredBy && (
          <div className={cn(
            "text-center text-[11px] leading-[11px] text-primary-foreground py-[3px] px-0 bg-primary"
          )}>
            Powered by{' '}
            <a
              href={poweredByUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-inherit underline"
            >
              {poweredByText}
            </a>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <StreamErrorBanner streamError={streamError} onClearError={clearStreamError} />
      <Conversation className="h-full">
        <ConversationContent>
          {messages.map((message) => {
            if(!message.parts.some(part => part.type === 'text')) {
              return <Loader key={message.id} />
            }

            return <div key={message.id}>
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {/* First render all text parts */}
                  {message.parts
                    .filter(part => part.type === 'text')
                    .map((part, i) => (
                      <Response 
                        key={`${message.id}-text-${i}`} 
                        parseIncompleteMarkdown
                        messageId={message.id}
                        onLinkClick={recordLinkClick}
                      >
                        {part.type === 'text' ? part.text : ''}
                      </Response>
                    ))
                  }
                  
                  {/* Then render tool calls after the text */}
                  {message.parts
                    .filter(part => part.type === 'tool-request_user_email')
                    .map((part, i) => {
                      if(part.type !== 'tool-request_user_email') {
                        return null
                      }

                      const args = part.output as { subject: string; conversationSummary: string } 
                      return (
                        <EmailInputMessage
                          key={`${message.id}-tool-${i}`}
                          onSubmit={async (email: string) => {
                            await submitEmailForToolCall(email, part.toolCallId, args.subject, args.conversationSummary)
                          }}
                        />
                      )
                    })
                  }
                </MessageContent>
              </Message>
            </div>
          })}
          {status === 'submitted' && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      
      {/* Suggestions area */}
      {shouldShowSuggestions && (
        <div className="px-4 py-3">
          <Suggestions>
            {configSuggestions?.map((suggestion, index) => (
              <Suggestion
                key={index}
                suggestion={suggestion.label || suggestion.prompt}
                analyticsLabel={suggestion.label}
                analyticsPosition={index}
                onAnalyticsClick={() => recordConversationStarterClick(suggestion.label || suggestion.prompt, index, suggestion.prompt)}
                onClick={() => handleSuggestionClick(suggestion.prompt)}
              />
            ))}
          </Suggestions>
        </div>
      )}
    
      <div className="p-4">
        <PromptInput onSubmit={handleSubmit} className="flex items-center pr-3">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputSubmit disabled={!input || !isInitialized} status={status} />
        </PromptInput>
      </div>

      {showPoweredBy && (
        <div className={cn(
          "text-center text-[11px] leading-[11px] text-primary-foreground py-[3px] px-0 bg-primary"
        )}>
          Powered by{' '}
          <a
            href={poweredByUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-inherit underline"
          >
            {poweredByText}
          </a>
        </div>
      )}


    </>
  );
});

ChatInterface.displayName = 'ChatInterface';