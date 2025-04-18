import { forwardRef, useMemo } from 'react'
import ChatHeader from '../ChatHeader/ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import './ChatWindow.css'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import type { ChatItem } from '@nlux/react'

interface ChatWindowProps {
  isOpen: boolean
  isClosing: boolean
  onClose: () => void
  onNewChat: () => void
  chatId: string | undefined
  initialConversation: ChatItem[] | undefined
  chatStatus: ChatStatus
}

export const ChatWindow = forwardRef<HTMLDivElement, ChatWindowProps>(
  ({ isOpen, isClosing, onClose, onNewChat, ...propDrop }, ref) => {
    // Generate CSS class names based on component state
    const className = useMemo(() => {
      const baseClass = 'chat-window'
      let stateClass = 'is-closed'

      if (isClosing) {
        stateClass = 'is-closing'
      } else if (isOpen) {
        stateClass = 'is-open'
      }

      return `${baseClass} ${stateClass}`
    }, [isClosing, isOpen])

    return (
      <div ref={ref} className={className} aria-hidden={!isOpen}>
        <ChatHeader onClose={onClose} onNewChat={onNewChat} />
        <ChatInterface {...propDrop} />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'
