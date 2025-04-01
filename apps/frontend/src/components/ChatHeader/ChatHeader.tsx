import './ChatHeader.css'
import { useConfig } from '../../contexts/ConfigContext'

interface ChatHeaderProps {
  onClose: () => void
}

const ChatHeader = ({ onClose }: ChatHeaderProps) => {
  const { title, logoUrl } = useConfig()

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
        <span className="chat-header-button" onClick={onClose}>
          —
        </span>
      </div>
    </div>
  )
}

export default ChatHeader
