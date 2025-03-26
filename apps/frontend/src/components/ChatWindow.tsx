import { forwardRef, useState, useEffect } from 'react'
import ChatHeader from './ChatHeader'
import ChatMessages from './ChatMessages'
import QuickActions from './QuickActions'
import ChatInput from './ChatInput'
import { ChatInterface } from './ChatInterface'

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
    const [isTyping, setIsTyping] = useState(false)

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

    // Function to send user message
    const sendUserMessage = (text: string) => {
      const newMessage = {
        id: Date.now(),
        text,
        isUser: true
      }
      setMessages(prev => [...prev, newMessage])

      // Simulate bot response
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)

        // Generate response based on user input
        let response = ''
        if (text.toLowerCase().includes('tasting')) {
          response =
            'Our wine tastings are available daily from 11am to 5pm. We offer several options including our Signature Tasting ($25), Reserve Tasting ($40), and Wine & Cheese Pairing ($55). Would you like to book a tasting?'
        } else if (
          text.toLowerCase().includes('event') ||
          text.toLowerCase().includes('space')
        ) {
          response =
            'We have beautiful event spaces for weddings, corporate events, and private parties. Our Barrel Room can accommodate up to 80 guests, while our Vineyard Terrace offers stunning views for up to 150 people. Would you like more information about our packages?'
        } else if (
          text.toLowerCase().includes('hours') ||
          text.toLowerCase().includes('open')
        ) {
          response =
            'West Hills Vineyard is open 7 days a week! Our hours are 11am-6pm Sunday through Thursday, and 11am-8pm on Friday and Saturday.'
        } else {
          response =
            'Thanks for your message! We offer premium wine tastings, vineyard tours, event spaces for special occasions, and a wine club with exclusive benefits. How can I help you today?'
        }

        sendBotMessage(response)
      }, 1500)
    }

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
    const handleQuickAction = (actionText: string) => {
      sendUserMessage(actionText)
    }

    // Chat window animation classes
    const chatWindowAnimationClasses = isClosing
      ? 'transform scale-[0.1] opacity-0 clip-path-inset-closing'
      : isOpen
        ? 'transform scale-100 opacity-100 clip-path-inset-open'
        : 'transform scale-0 opacity-0 clip-path-inset-closed'

    // Position origin for animation
    const transformOrigin =
      position === 'bottom-right' ? 'bottom right' : 'bottom left'

    return (
      <div
        ref={ref}
        className={`w-[385px] h-[555px] absolute bottom-[70px] ${position === 'bottom-right' ? 'right-0' : 'left-0'} 
                  max-w-[90vw] max-h-[80vh] bg-[#222] rounded-[10px] shadow-xl flex flex-col overflow-hidden 
                  will-change-transform will-change-opacity transition-all duration-400 ease-in-out ${chatWindowAnimationClasses}`}
        style={{ transformOrigin }}
      >
        <ChatHeader
          title={title}
          logoUrl={logoUrl}
          onClose={onClose}
          onMinimize={onClose}
        />

        <ChatInterface />

            {/* <ChatMessages messages={messages} isTyping={isTyping} />

            <QuickActions onActionClick={handleQuickAction} />

            <ChatInput onSendMessage={sendUserMessage} /> */}
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'

export default ChatWindow
