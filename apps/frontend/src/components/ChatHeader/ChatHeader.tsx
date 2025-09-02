import { useState, useCallback, useRef } from 'react'
import { useResizeObserver } from '../../hooks/useResizeObserver'
import { useConfig } from '../../contexts/ConfigContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  onClose: () => void
  onNewChat: () => void
}

export const ChatHeader = ({ onClose }: ChatHeaderProps) => {
  const { title, logoUrl, theme } = useConfig()
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

  const { width } = useResizeObserver(100)

  const isMobile = width < 768

  const themeClass = theme === 'secondary' ? 'bg-background text-foreground border-b-1 border-primary' : 'bg-primary text-primary-foreground'

  const buttonClass = theme === 'secondary' ? '' : 'text-primary-foreground bg-white/20 hover:bg-white/30 hover:text-primary-foreground'
  
  return (
    <div ref={headerRef} className={cn("flex items-center justify-between p-[15px] font-sans", themeClass)}>
      {/* Branding section */}
      <div className="flex items-center flex-grow">
        {logoUrl && (
          <img src={logoUrl} alt="Brand Logo" className="h-[30px] max-h-[30px] mr-[10px]" />
        )}
        <div className="font-bold text-base leading-[30px] font-sans">{title}</div>
      </div>

      {/* Controls */}
      <div className="flex gap-[10px]">
        {/* <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          className={cn(
            "w-[28px] h-[28px] text-primary-foreground bg-white/20 rounded-sm",
            "hover:bg-white/30 hover:text-primary-foreground font-sans"
          )}
          onClick={toggleMenu}
          data-chat-button
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="fill-primary-foreground">
            <path d="M14 8H8V14H6V8H0V6H6V0H8V6H14V8Z" />
          </svg>
        </Button> */}
        <Button
          variant={theme === 'secondary' ? 'default' : 'ghost'}
          size="icon"
          className={cn(
            "w-[28px] h-[28px] rounded-sm",
            buttonClass,
            "font-sans"
          )}
          onClick={onClose}
          data-chat-button
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="fill-primary-foreground">
            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
