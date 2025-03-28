import { useRef, useEffect } from 'react'

interface ChatMessagesProps {
  messages: Array<{ id: number; text: string; isUser: boolean }>
  isTyping: boolean
}

const ChatMessages = ({ messages, isTyping }: ChatMessagesProps) => {
  // eslint-disable-next-line no-null/no-null
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div className="flex-1 p-[15px] overflow-y-auto flex flex-col gap-[10px] text-[#eee]">
      {messages.map(message => (
        <div
          key={message.id}
          className={`
            max-w-[80%] p-[10px_12px] rounded-[15px] text-[14px] leading-[1.4]
            ${
              message.isUser
                ? 'bg-[#0084ff] self-end rounded-br-[5px]'
                : 'bg-[#444] self-start rounded-bl-[5px]'
            }
          `}
        >
          {message.text}
        </div>
      ))}

      {/* Typing indicator */}
      {isTyping && (
        <div className="p-[10px_12px] bg-[#444] rounded-[15px] rounded-bl-[5px] self-start w-fit mt-[10px]">
          <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#ccc] mr-[5px] animate-typing"></span>
          <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#ccc] mr-[5px] animate-typing animation-delay-200"></span>
          <span className="inline-block w-[8px] h-[8px] rounded-full bg-[#ccc] animate-typing animation-delay-400"></span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}

export default ChatMessages
