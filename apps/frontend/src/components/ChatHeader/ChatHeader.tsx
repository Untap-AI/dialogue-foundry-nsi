import './ChatHeader.css'
import { useConfig } from '../../contexts/ConfigContext'
import { useResizeObserver } from '../../hooks/useResizeObserver'

interface ChatHeaderProps {
  onClose: () => void
}

const ChatHeader = ({ onClose }: ChatHeaderProps) => {
  const { title, logoUrl } = useConfig()

  const { width } = useResizeObserver(100)

  // TODO: Need a global breakpoint for mobile
  const isMobile = width < 768

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
          {isMobile ? 'Close' : '—'}
        </span>
      </div>
    </div>
  )
}

export default ChatHeader
