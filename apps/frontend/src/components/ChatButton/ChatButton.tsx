import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import './ChatButton.css'
import { useConfig } from '../../contexts/ConfigContext'
import { PopupMessage } from './PopupMessage'

const POPUP_DELAY = 3000
const POPUP_DURATION = 10000
const DIALOGUE_FOUNDRY_POPUP_KEY = 'dialogue_foundry_popup'
const ANIMATION_CLASS = `chat-button-animation-twist`

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

  const popupEnabled = useMemo(() => popupMessage &&
      popupMessage.length > 0 && !getLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY), [popupMessage])
      

  useEffect(() => {
    if(isOpen && popupEnabled) {
      setLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY, 'true')
      buttonRef.current?.classList.remove(ANIMATION_CLASS)
      setPopupVisible(false)
    }
  }, [isOpen, popupEnabled])

  // Synchronize animation with popup visibility
  useEffect(() => {
    if (!buttonRef.current || !popupEnabled) return

    const button = buttonRef.current

    // Add animation class after popup delay (when popup appears)
    const startAnimationTimer = setTimeout(() => {
      if (getLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY)) return

      setLocalStorageItem(DIALOGUE_FOUNDRY_POPUP_KEY, 'true')
      button.classList.add(ANIMATION_CLASS)
      setPopupVisible(true)
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
      <button
        ref={buttonRef}
        data-chat-button
        className="chat-icon-button"
        onClick={onClick}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {/* Icon */}
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          <path d="M7 9h10v2H7z" />
          <path d="M7 12h7v2H7z" />
        </svg>
      </button>

      {popupVisible && <PopupMessage buttonRef={buttonRef} />}
    </>
  )
}
