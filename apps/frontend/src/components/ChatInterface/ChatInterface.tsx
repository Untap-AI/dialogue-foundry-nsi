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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import type { ChatStatus } from '../../hooks/useChatPersistence';

interface ChatInterfaceProps {
  onNewChatRequest?: () => void;
  onChatStatusChange?: (status: ChatStatus) => void;
}

// Create a ref interface for exposing methods to parent
export interface ChatInterfaceRef {
  createNewChat: () => Promise<void>;
}

export const ChatInterface = React.forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  ({ onNewChatRequest, onChatStatusChange }, ref) => {
  const { chatConfig, poweredBy, welcomeMessage } = useConfig()
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
  } = useChatPersistence();

  console.log(messages)

  const isInitialized = chatStatus === 'initialized'

  // Notify parent of chat status changes
  React.useEffect(() => {
    onChatStatusChange?.(chatStatus)
  }, [chatStatus, onChatStatusChange])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && isInitialized) {
      sendMessage({
        text: input,
      });
      setInput('');
    }
  };

  return (
    <>
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => {
                if(!message.parts.some(part => part.type === 'text')) {
                  return <Loader key={message.id} />
                }
                
                return <div key={message.id}>
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <Response key={`${message.id}-${i}`} parseIncompleteMarkdown>
                                {part.text}
                              </Response>
                            );
                          default:
                            return null;
                        }
                      })}
                    </MessageContent>
                  </Message>
                </div>
  })}
              {status === 'submitted' && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        
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