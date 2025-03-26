import { useState } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
}

const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage) {
      onSendMessage(trimmedMessage)
      setMessage('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="p-[15px] border-t border-[#444] flex gap-[10px]">
      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        className="flex-1 p-[10px_15px] rounded-[20px] border-none bg-[#333] text-white focus:outline-none focus:bg-[#3a3a3a]"
      />
      <button
        onClick={handleSend}
        className="bg-[#0084ff] text-white border-none w-[40px] h-[40px] rounded-full flex justify-center items-center cursor-pointer transition-colors hover:bg-[#0066cc]"
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-[18px] h-[18px]">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  )
}

export default ChatInput
