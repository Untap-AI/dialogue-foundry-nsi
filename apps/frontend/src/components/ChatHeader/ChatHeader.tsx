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

  const themeClass = theme === 'secondary' ? 'df:bg-background df:text-foreground df:border-b-1 df:border-primary' : 'df:bg-primary df:text-primary-foreground'

  const buttonClass = theme === 'secondary' ? '' : 'df:text-primary-foreground df:bg-white/20 df:hover:bg-white/30 df:hover:text-primary-foreground'
  
  return (
    <div 
      ref={headerRef} 
      className={cn("df:flex df:items-center df:justify-between df:p-[15px] df:font-sans", themeClass)}
      data-dialogue-foundry-id="chat-header"
    >
      {/* Branding section */}
      <div className="df:flex df:items-center df:flex-grow">
        {logoUrl && (
          <img src={logoUrl} alt="Brand Logo" className="df:h-[30px] df:max-h-[30px] df:mr-[10px]" />
        )}
        <div className="df:font-bold df:text-base df:leading-[30px] df:font-sans">{title}</div>
      </div>

      {/* Controls */}
      <div className="df:flex df:gap-[10px]">
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
            "df:w-[28px] df:h-[28px] df:rounded-md",
            buttonClass,
            "df:font-sans"
          )}
          onClick={onClose}
          data-chat-button
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="df:fill-primary-foreground">
            <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
