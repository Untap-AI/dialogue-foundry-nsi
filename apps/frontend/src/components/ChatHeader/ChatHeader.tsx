import './ChatHeader.css'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useConfig } from '../../contexts/ConfigContext'
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
          className="chat-header-button icon-button"
          onClick={toggleMenu}
          data-chat-button
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z" />
          </svg>
        </span>
        <span className="chat-header-button icon-button" onClick={onClose} data-chat-button>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
          </svg>
        </span>
      </div>

      {/* Menu dropdown */}
      {isMenuOpen && (
        <Portal containerSelector={isMobile ? '.mobile-chat-modal' : undefined}>
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
