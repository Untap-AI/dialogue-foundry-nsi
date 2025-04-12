import React, { useRef, useEffect, useState } from 'react';
import './ChatButton.css'
import { PopupMessage } from './PopupMessage';

interface ChatButtonProps {
  onClick: () => void
  isOpen: boolean
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick, isOpen }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

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

      <PopupMessage 
        config={welcomePopup} 
        buttonRef={buttonRef}
        visible={popupVisible}
        setVisible={setPopupVisible} 
      />
    </>
  )
}
