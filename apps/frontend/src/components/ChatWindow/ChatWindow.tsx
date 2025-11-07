import { forwardRef, useMemo, useRef } from 'react'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import { ChatInterface, type ChatInterfaceRef } from '../ChatInterface/ChatInterface'
import type { ChatStatus } from '../../hooks/useChatPersistence'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  onChatStatusChange?: (status: ChatStatus) => void
}

export const ChatWindow = forwardRef<HTMLDivElement, ChatWindowProps>(
  ({ isOpen, onClose, onNewChat, onChatStatusChange }, ref) => {
    const chatInterfaceRef = useRef<ChatInterfaceRef>(null)

    // Handle new chat creation from header
    const handleNewChat = async () => {
      await chatInterfaceRef.current?.createNewChat()
      onNewChat()
    }
    // Generate CSS class names based on component state
    const className = useMemo(() => {
      const baseClasses = cn(
        "df:w-[385px] df:h-[555px] df:absolute df:bottom-[70px] df:max-w-[90vw] df:max-h-[80vh]",
        "df:rounded-[10px] df:shadow-xl df:flex df:flex-col df:overflow-hidden",
        "df:transition-all df:duration-300 df:ease-out df:delay-[50ms]",
        "df:bg-background df:text-foreground df:right-0 df:origin-bottom-right"
      )

      if (isOpen) {
        return cn(baseClasses, "df:scale-100 df:opacity-100 df:translate-x-0 df:translate-y-0 df:pointer-events-auto")
      }

      return cn(baseClasses, "df:scale-0 df:opacity-0 df:translate-y-2 df:pointer-events-none")
    }, [isOpen])
    
    const windowStyle = {
      bottom: 'calc(1/6 * var(--df-widget-button-size) + var(--df-widget-button-size)) !important'
    }

    return (
      <div ref={ref} className={className} data-dialogue-foundry-id="chat-window" aria-hidden={!isOpen} style={windowStyle}>
        <ChatHeader onClose={onClose} onNewChat={handleNewChat} />
        <ChatInterface 
          ref={chatInterfaceRef}
          onNewChatRequest={onNewChat}
          onChatStatusChange={onChatStatusChange}
        />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'
