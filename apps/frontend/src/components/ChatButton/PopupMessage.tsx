import React, { useEffect } from 'react';
import './PopupMessage.css';

interface PopupMessageProps {
  config: {
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
  buttonRef: React.RefObject<HTMLButtonElement>;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const PopupMessage: React.FC<PopupMessageProps> = ({ 
  config, 
  buttonRef, 
  visible,
  setVisible 
}) => {
  // Calculate position relative to the button
  const getPosition = () => {
    if (!buttonRef.current) return { right: '20px', bottom: '80px' };
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const buttonHeight = buttonRect.height;
    // Use button height + an offset to calculate position
    const offset = buttonHeight + 33;
    
    return {
      right: '20px',
      bottom: `${offset}px`
    };
  };

  useEffect(() => {
    if (!config.enabled) return;

    // The parent component now controls visibility
    return () => {
      // Cleanup if needed
    };
  }, [config]);

  if (!config.enabled || !visible) return null;

  const popupStyle = {
    ...getPosition(),
    fontSize: config.fontSize,
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    borderRadius: config.borderRadius,
    padding: config.padding,
    boxShadow: config.boxShadow,
    maxWidth: config.maxWidth
  };

  return (
    <div className="chat-popup-message" style={popupStyle}>
      <p>{config.message}</p>
      <div className="chat-popup-arrow"></div>
    </div>
  );
}; 