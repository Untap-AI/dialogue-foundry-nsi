import './ChatHeader.css'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useConfig } from '../../contexts/ConfigContext'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { Portal } from '../Portal/Portal'

interface ChatHeaderProps {
  onClose: () => void
  onNewChat: () => void
}

export const ChatHeader = ({ onClose, onNewChat }: ChatHeaderProps) => {
  const { title, logoUrl } = useConfig()
  // eslint-disable-next-line no-null/no-null
  const menuRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line no-null/no-null
  const buttonRef = useRef<HTMLSpanElement>(null)
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null)

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

  const toggleMenu = useCallback(() => {
    if (!isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 5,
        right: window.innerWidth - rect.right
      })
    }
    setIsMenuOpen(!isMenuOpen)
  }, [isMenuOpen])

  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const { width } = useResizeObserver(100)

  // TODO: Need a global breakpoint for mobile
  const isMobile = width < 768

  return (
    <div ref={headerRef} className="chat-header">
      {/* Branding section */}
      <div className="chat-header-branding">
        {logoUrl && (
          <img src={logoUrl} alt="Brand Logo" className="chat-header-logo" />
        )}
        <div className="chat-header-title">{title}</div>
      </div>

      {/* Controls */}
      <div className="chat-header-controls">
        <span
          ref={buttonRef}
          className="chat-header-button"
          onClick={toggleMenu}
          data-chat-button
        >
          ⋮
        </span>
        <span className="chat-header-button" onClick={onClose} data-chat-button>
          {isMobile ? 'Close' : '—'}
        </span>
      </div>

      {/* Menu dropdown */}
      {isMenuOpen && (
        <Portal>
          <div
            ref={menuRef}
            className="chat-header-menu"
            onClick={handleMenuClick}
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`
            }}
            data-chat-button
          >
            <div
              className="chat-header-menu-item"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onNewChat()
                setIsMenuOpen(false)
              }}
              data-chat-button
            >
              New Chat
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
