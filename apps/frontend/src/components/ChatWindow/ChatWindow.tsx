import { forwardRef, useMemo } from 'react'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import './ChatWindow.css'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import type { ChatItem } from '@nlux/react'

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
      const baseClass = 'chat-window'

      if (isOpen) {
        return `${baseClass} is-open`
      }

      return `${baseClass} is-closed`
    }, [isOpen])

    return (
      <div ref={ref} className={className} aria-hidden={!isOpen}>
        <ChatHeader onClose={onClose} onNewChat={onNewChat} />
        <ChatInterface {...propDrop} />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'
