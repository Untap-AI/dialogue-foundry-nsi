import { useState, useRef, useEffect } from 'react'
import { ChatInterface } from '@dialogue-foundry/chat-core'

export interface WidgetProps {
  position?: 'bottom-right' | 'bottom-left'
  buttonColor?: string
  title?: string
  showNotificationDot?: boolean
}

export const Widget = ({
  position = 'bottom-right',
  buttonColor = '#2563eb',
  title = 'Chat with us',
  showNotificationDot = false
}: WidgetProps) => {
  const [isOpen, setIsOpen] = useState(false)
  // eslint-disable-next-line no-null/no-null
  const chatWindowRef = useRef<HTMLDivElement>(null)

  console.log('isOpen', isOpen)

  const toggleChat = () => {
    setIsOpen(!isOpen)
  }

  // Handle clicking outside to close chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        // Don't close if clicking on the button
        const target = event.target as HTMLElement
        if (target.closest('[data-chat-button]')) return

        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Position classes based on the position prop
  const positionClasses =
    position === 'bottom-right' ? 'right-5 bottom-5' : 'left-5 bottom-5'

  // Chat window animation classes
  const chatWindowAnimationClasses = isOpen
    ? 'opacity-100 scale-100'
    : 'opacity-0 scale-95 pointer-events-none'

  // Position origin for animation
  const transformOrigin =
    position === 'bottom-right' ? 'bottom right' : 'bottom left'

  return (
    <div className={`fixed z-[9999] ${positionClasses}`}>
      {/* Chat window */}
      {isOpen ? (
        <div
          ref={chatWindowRef}
          className={`w-[350px] h-[500px] max-h-[70vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden mb-3 ${chatWindowAnimationClasses} transition-all duration-300 ease-in-out`}
          style={{ transformOrigin }}
        >
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center shadow-sm">
            <h3 className="m-0 text-lg font-medium flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              {title}
            </h3>
            <button
              className="bg-transparent border-none text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              onClick={toggleChat}
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface height="100%" />
          </div>
        </div>
      ) : (
        <></>
      )}

      {/* Chat button */}
      <button
        data-chat-button
        className="w-14 h-14 rounded-full text-white border-none shadow-lg hover:scale-110 hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center justify-center relative "
        onClick={toggleChat}
        style={{ backgroundColor: buttonColor }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {showNotificationDot && !isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
        >
          {isOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </>
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          )}
        </svg>
      </button>
    </div>
  )
}
