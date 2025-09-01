import { forwardRef, useMemo } from 'react'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import type { ChatItem } from '../../nlux'
import { cn } from '@/lib/utils'

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  chatId: string | undefined
  initialConversation: ChatItem[] | undefined
  chatStatus: ChatStatus
}

export const ChatWindow = forwardRef<HTMLDivElement, ChatWindowProps>(
  ({ isOpen, onClose, onNewChat, ...propDrop }, ref) => {
    // Generate CSS class names based on component state
    const className = useMemo(() => {
      const baseClasses = cn(
        "w-[385px] h-[555px] absolute bottom-[70px] max-w-[90vw] max-h-[80vh]",
        "rounded-[10px] shadow-xl flex flex-col overflow-hidden",
        "transition-all duration-300 ease-out delay-[50ms]",
        "bg-background text-foreground right-0 origin-bottom-right"
      )

      if (isOpen) {
        return cn(baseClasses, "scale-100 opacity-100 translate-x-0 translate-y-0 pointer-events-auto")
      }

      return cn(baseClasses, "scale-0 opacity-0 translate-y-2 pointer-events-none")
    }, [isOpen])

    return (
      <div ref={ref} className={className} aria-hidden={!isOpen}>
        <ChatHeader onClose={onClose} onNewChat={onNewChat} />
        <ChatInterface />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'
