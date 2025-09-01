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
        <Conversation className="overflow-y-auto">
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
        <div className="text-center text-[11px] leading-[11px] text-[var(--df-text-contrast-color)] py-[3px] px-0 bg-[var(--df-primary-color)]">
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