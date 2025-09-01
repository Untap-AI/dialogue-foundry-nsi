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
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Response } from '@/components/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/sources';

import { Loader } from '@/components/loader';
import { DefaultChatTransport } from 'ai';
import { useConfig } from '@/contexts/ConfigContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const ChatInterface = () => {
  const { chatConfig, poweredBy } = useConfig()
  const [input, setInput] = useState('');

  const { apiBaseUrl } = chatConfig
  const showPoweredBy = poweredBy?.show ?? true
  const poweredByText = poweredBy?.text ?? 'Untap AI'
  const poweredByUrl = poweredBy?.url ?? 'https://untap-ai.com'
  
  // Configure useChat with your backend endpoint
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ 
      api: `${apiBaseUrl}/chats/stream`,
    }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        text: input,
      });
      setInput('');
    }
  };

  return (
    <>
        <ScrollArea className="flex-1">
          <Conversation className="h-full">
            <ConversationContent>
              {messages.map((message) => (
                <div key={message.id}>
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              <Response key={`${message.id}-${i}`}>
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
              ))}
              {status === 'submitted' && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </ScrollArea>
        
        <div className="p-4">
          <PromptInput onSubmit={handleSubmit} className="flex items-center pr-3">
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
            <PromptInputSubmit disabled={!input} status={status} />
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
};