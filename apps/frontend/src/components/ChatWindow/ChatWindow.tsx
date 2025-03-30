import { forwardRef } from 'react'
import ChatHeader from '../ChatHeader/ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import './ChatWindow.css'

interface ChatWindowProps {
  isOpen: boolean
  isClosing: boolean
  onClose: () => void
}

export const ChatWindow = forwardRef<HTMLDivElement, ChatWindowProps>(
  ({ isOpen, isClosing, onClose }, ref) => {
    // Generate CSS class names based on component state
    const getClassName = () => {
      const baseClass = 'chat-window'
      let stateClass = 'is-closed'

      if (isClosing) {
        stateClass = 'is-closing'
      } else if (isOpen) {
        stateClass = 'is-open'
      }

      return `${baseClass} ${stateClass}`
    }

    return (
      <div ref={ref} className={getClassName()} aria-hidden={!isOpen}>
        <ChatHeader onClose={onClose} />
        <ChatInterface />
      </div>
    )
  }
)

ChatWindow.displayName = 'ChatWindow'
