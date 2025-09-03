import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useConfig } from '../../contexts/ConfigContext'
import { PopupMessage } from './PopupMessage'
import { logger } from '../../services/logger'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const POPUP_DELAY = 3000
const POPUP_DURATION = 10000
const DIALOGUE_FOUNDRY_POPUP_KEY = 'dialogue_foundry_popup'
const ANIMATION_CLASS = `animate-[twist_10s_ease-in-out_infinite]`

// Helper to safely access localStorage
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const getLocalStorageItem = (key: string) => {
  if (isLocalStorageAvailable()) {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string) => {
  if (isLocalStorageAvailable()) {
    localStorage.setItem(key, value);
  }
};

interface ChatButtonProps {
  onClick: () => void
  isOpen: boolean
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => {
  // eslint-disable-next-line no-null/no-null
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { popupMessage } = useConfig()
  const [popupVisible, setPopupVisible] = useState(false)

  const popupEnabled = useMemo(() => {
    try {
      return popupMessage &&
        popupMessage.length > 0 && !getLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY)
    } catch (error) {
      // Handle SecurityError or other localStorage access errors
      logger.warning('localStorage access denied, disabling popup:', error)
      return false
    }
  }, [popupMessage])
      

  useEffect(() => {
    if(isOpen && popupEnabled) {
      try {
        setLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY, 'true')
        buttonRef.current?.classList.remove(ANIMATION_CLASS)
        setPopupVisible(false)
      } catch (error) {
        console.warn('localStorage access denied:', error)
      }
    }
  }, [isOpen, popupEnabled])

  // Synchronize animation with popup visibility
  useEffect(() => {
    if (!buttonRef.current || !popupEnabled) return

    const button = buttonRef.current

    // Add animation class after popup delay (when popup appears)
    const startAnimationTimer = setTimeout(() => {
      try {
        if (getLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY)) return

        setLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY, 'true')
        button.classList.add(ANIMATION_CLASS)
        setPopupVisible(true)
      } catch (error) {
        console.warn('localStorage access denied:', error)
      }
    }, POPUP_DELAY)

    // Remove animation class when popup disappears
    const stopAnimationTimer = setTimeout(() => {
      button.classList.remove(ANIMATION_CLASS)
      setPopupVisible(false)
    }, POPUP_DELAY + POPUP_DURATION)

    return () => {
      clearTimeout(startAnimationTimer)
      clearTimeout(stopAnimationTimer)
      button.classList.remove(ANIMATION_CLASS)
    }
  }, [popupEnabled])

  return (
    <>
      <Button
        ref={buttonRef}
        data-chat-button
        size="icon"
        className={cn(
          "df:w-[60px] df:h-[60px] df:rounded-full df:shadow-lg df:transition-all df:duration-200 df:hover:scale-105 df:hover:shadow-xl df:active:scale-95",
          "df:bg-primary df:text-primary-foreground df:border-none df:p-0 df:m-0"
        )}
        onClick={onClick}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Icon */}
        <svg viewBox="0 0 24 24" className="df:fill-primary-foreground df:!h-[30px] df:!w-[30px]">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          <path d="M7 9h10v2H7z" />
          <path d="M7 12h7v2H7z" />
        </svg>
      </Button>

      {popupVisible && <PopupMessage buttonRef={buttonRef} />}
    </>
  )
}
