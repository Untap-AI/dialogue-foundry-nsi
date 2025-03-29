import { useState } from 'react'
import './ChatHeader.css'

interface ChatHeaderProps {
  title: string
  logoUrl?: string
  onClose: () => void
  onMinimize: () => void
}

const ChatHeader = ({
  title,
  logoUrl,
  onClose,
  onMinimize
}: ChatHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNewChat = () => {
    // Handle new chat functionality
    setIsMenuOpen(false)
    // Additional logic for new chat would go here
  }

  const handleEndChat = () => {
    setIsMenuOpen(false)
    onClose()
  }

  return (
    <div className="chat-header">
      {/* Branding section */}
      <div className="chat-header-branding">
        {logoUrl && (
          <img src={logoUrl} alt="Brand Logo" className="chat-header-logo" />
        )}
        <div className="chat-header-title">{title}</div>
      </div>

      {/* Controls */}
      <div className="chat-header-controls">
        {/* <span className="chat-header-button" onClick={toggleMenu}>
          ⋮
        </span> */}
        <span className="chat-header-button" onClick={onMinimize}>
          —
        </span>
      </div>

      {/* Menu dropdown */}
      {/* {isMenuOpen && (
        <div className="chat-header-menu">
          <div className="chat-header-menu-item" onClick={handleNewChat}>
            New Chat
          </div>
          <div className="chat-header-menu-item" onClick={handleEndChat}>
            End Chat
          </div>
          <div className="chat-header-menu-item">Recent Chats</div>
        </div>
      )} */}
    </div>
  )
}

export default ChatHeader
