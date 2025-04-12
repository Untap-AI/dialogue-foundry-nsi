import React, { useRef, useEffect, useState } from 'react';
import './ChatButton.css'
import { PopupMessage } from './PopupMessage';

interface ChatButtonProps {
  onClick: () => void
  isOpen: boolean
  config: {
    welcomePopup: {
      enabled: boolean;
      message: string;
      delay: number;
      duration: number;
      fontSize: string;
      backgroundColor: string;
      textColor: string;
      borderRadius: string;
      padding: string;
      boxShadow: string;
      maxWidth: string;
    };
    buttonAnimation: {
      enabled: boolean;
      type: string;
      duration: string;
    };
  };
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen, config }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { buttonAnimation, welcomePopup } = config;
  const [popupVisible, setPopupVisible] = useState(false);
  
  // Synchronize animation with popup visibility
  useEffect(() => {
    if (!buttonRef.current || !buttonAnimation.enabled || !welcomePopup.enabled) return;

    const button = buttonRef.current;
    const animationClass = `chat-button-animation-${buttonAnimation.type}`;
    
    // Add animation class after popup delay (when popup appears)
    const startAnimationTimer = setTimeout(() => {
      console.log('Starting button animation');
      button.classList.add(animationClass);
      setPopupVisible(true);
    }, welcomePopup.delay);
    
    // Remove animation class when popup disappears
    const stopAnimationTimer = setTimeout(() => {
      console.log('Stopping button animation');
      button.classList.remove(animationClass);
      setPopupVisible(false);
    }, welcomePopup.delay + welcomePopup.duration);
    
    return () => {
      clearTimeout(startAnimationTimer);
      clearTimeout(stopAnimationTimer);
      button.classList.remove(animationClass);
    };
  }, [buttonAnimation, welcomePopup]);

  return (
    <>
      <button
        ref={buttonRef}
        data-chat-button
        className="chat-icon-button"
        onClick={onClick}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        style={buttonAnimation.enabled ? { 
          animationDuration: buttonAnimation.duration 
        } : {}}
      >
        {/* Icon */}
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
          <path d="M7 9h10v2H7z" />
          <path d="M7 12h7v2H7z" />
        </svg>
      </button>

      <PopupMessage 
        config={welcomePopup} 
        buttonRef={buttonRef}
        visible={popupVisible}
        setVisible={setPopupVisible} 
      />
    </>
  )
}
