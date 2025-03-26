import { useState, useRef, useEffect } from 'react'

interface ChatIconProps {
  onClick: () => void
  buttonColor: string
  isOpen: boolean
}

const ChatIcon = ({ onClick, buttonColor, isOpen }: ChatIconProps) => {
  // eslint-disable-next-line no-null/no-null
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([])
  const [showBlob, setShowBlob] = useState(false)

  // Handle click with ripple effect
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return

    // Create ripple effect
    const button = buttonRef.current
    const rect = button.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const rippleId = Date.now()
    setRipples(prev => [...prev, { id: rippleId, x, y }])

    // Remove ripple after animation completes
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== rippleId))
    }, 600)

    // Create blob effect on open
    if (!isOpen) {
      setShowBlob(true)
      setTimeout(() => setShowBlob(false), 600)
    }

    onClick()
  }

  // Clean up ripples when component unmounts
  useEffect(() => {
    return () => {
      setRipples([])
    }
  }, [])

  return (
    <button
      ref={buttonRef}
      data-chat-button
      className="w-[60px] h-[60px] rounded-full text-white border-none shadow-lg 
                hover:scale-105 hover:shadow-xl active:scale-95 transition-all duration-200 
                flex items-center justify-center relative"
      onClick={handleClick}
      style={{ backgroundColor: buttonColor }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {/* Blob animation when clicked */}
      {showBlob && (
        <div
          className="absolute rounded-full bg-current transform scale-0 z-[1] animate-blob-grow"
          style={{
            width: '120%',
            height: '120%',
            backgroundColor: buttonColor,
            insetInlineStart: '-10%',
            insetBlockStart: '-10%'
          }}
        />
      )}

      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 transform scale-0 pointer-events-none animate-ripple"
          style={{
            insetInlineStart: `${ripple.x}px`,
            insetBlockStart: `${ripple.y}px`,
            width: '100%',
            height: '100%'
          }}
        />
      ))}

      {/* Icon */}
      <svg viewBox="0 0 24 24" className="w-[30px] h-[30px] fill-white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
        <path d="M7 9h10v2H7z" />
        <path d="M7 12h7v2H7z" />
      </svg>
    </button>
  )
}

export default ChatIcon
