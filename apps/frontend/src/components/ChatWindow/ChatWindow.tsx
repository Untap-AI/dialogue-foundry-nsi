import { forwardRef, useState, useEffect } from 'react'
import ChatHeader from '../ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'

interface ChatWindowProps {
  isOpen: boolean
  isClosing: boolean
  title: string
  logoUrl?: string
  position: 'bottom-right' | 'bottom-left'
  onClose: () => void
}

const ChatWindow = forwardRef<HTMLDivElement, ChatWindowProps>(
  ({ isOpen, isClosing, title, logoUrl, position, onClose }, ref) => {
    const [messages, setMessages] = useState<
      Array<{ id: number; text: string; isUser: boolean }>
    >([])

    // Add a greeting message when chat first opens
    useEffect(() => {
      if (isOpen && messages.length === 0) {
        setTimeout(() => {
          const welcomeMessage =
            "Hi there! 🍷 I'm West Hills Vineyard's virtual assistant. Ask me anything about our winery, event spaces, tastings, or whatever you'd like to know!"
          sendBotMessage(welcomeMessage)
        }, 400)
      }
    }, [isOpen, messages.length])

    // Function to add bot message
    const sendBotMessage = (text: string) => {
      const newMessage = {
        id: Date.now(),
        text,
        isUser: false
      }
      setMessages(prev => [...prev, newMessage])
    }

    // Function to handle quick action clicks
    // const handleQuickAction = (actionText: string) => {
    //   sendUserMessage(actionText)
    // }

    // Chat window animation classes with enhanced transition effects
    const chatWindowAnimationClasses = isClosing
      ? `scale-[0.1] opacity-0 translate-y-4 pointer-events-none ${position === 'bottom-right' ? 'origin-bottom-right' : 'origin-bottom-left'}`
      : isOpen
        ? `scale-100 opacity-100 translate-y-0 ${position === 'bottom-right' ? 'origin-bottom-right' : 'origin-bottom-left'}`
        : `scale-0 opacity-0 translate-y-8 pointer-events-none ${position === 'bottom-right' ? 'origin-bottom-right' : 'origin-bottom-left'}`

    // Separate Tailwind class for the base styles vs animation properties
    const baseClasses = `
      w-[385px] h-[555px] absolute bottom-[70px] ${position === 'bottom-right' ? 'right-0' : 'left-0'}
      max-w-[90vw] max-h-[80vh] rounded-[10px] shadow-xl flex flex-col overflow-hidden
      transform transition-all duration-500 delay-75 ease-out
    `

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${chatWindowAnimationClasses}`}
        aria-hidden={!isOpen}
      >
        <ChatHeader
          title={title}
          logoUrl={logoUrl}
          onClose={onClose}
          onMinimize={onClose}
        />

        <ChatInterface />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'

export default ChatWindow
