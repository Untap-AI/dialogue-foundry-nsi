import React, { useEffect, useState } from 'react';
import './PopupMessage.css';
import { useConfig } from 'src/contexts/ConfigContext';

interface PopupMessageProps {

}

export const PopupMessage: React.FC<PopupMessageProps> = ({ 
  config, 
  buttonRef, 
  visible,
}) => {

  const { popupMessage } = useConfig()

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

  const popupStyle = {
    ...getPosition(),
  };

  return (
    <div className="chat-popup-message" style={popupStyle}>
      <p>{popupMessage}</p>
      <div className="chat-popup-arrow"></div>
    </div>
  );
}; 