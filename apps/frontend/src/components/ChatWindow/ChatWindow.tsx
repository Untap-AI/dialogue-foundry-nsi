import { forwardRef } from 'react'
import ChatHeader from '../ChatHeader/ChatHeader'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import './ChatWindow.css'

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
    // Generate CSS class names based on component state
    const getClassName = () => {
      const baseClass = 'chat-window'
      const positionClass =
        position === 'bottom-right' ? 'bottom-right' : 'bottom-left' 
      let stateClass = 'is-closed'

      if (isClosing) {
        stateClass = 'is-closing'
      } else if (isOpen) {
        stateClass = 'is-open'
      }

      return `${baseClass} ${positionClass} ${stateClass}`
    }

    return (
      <div ref={ref} className={getClassName()} aria-hidden={!isOpen}>
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
