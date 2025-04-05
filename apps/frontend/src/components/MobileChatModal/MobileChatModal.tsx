import { useRef, useEffect, useCallback } from 'react'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import ChatHeader from '../ChatHeader/ChatHeader'
import './MobileChatModal.css'

interface MobileChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileChatModal = ({ isOpen, onClose }: MobileChatModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Function to scroll to the bottom of the conversation
  const scrollToBottom = useCallback(() => {
    const conversationContainer = document.querySelector('.nlux-conversation-container')
    if (conversationContainer && conversationContainer instanceof HTMLElement) {
      conversationContainer.scrollTop = conversationContainer.scrollHeight
    }
  }, [])

  // Set up a ResizeObserver to detect changes in the conversation container
  useEffect(() => {
    const setupResizeObserver = () => {
      const segmentsContainer = document.querySelector('.nlux-chatSegments-container')
      if (segmentsContainer && !resizeObserverRef.current) {
        // Create a new ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
          // When container resizes, scroll to bottom
          scrollToBottom()
        })
        
        // Start observing the container
        resizeObserver.observe(segmentsContainer)
        resizeObserverRef.current = resizeObserver
        
        console.log('ResizeObserver set up for conversation container')
      }
    }
    
    if (isOpen) {
      // Try to set up the observer immediately
      setupResizeObserver()
      
      // Also try again after a delay to ensure the element is in the DOM
      setTimeout(setupResizeObserver, 500)
    }
    
    return () => {
      // Clean up the ResizeObserver when component unmounts or modal closes
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
        resizeObserverRef.current = null
      }
    }
  }, [isOpen, scrollToBottom])

  // Set up an event listener for clicks and touches on the input area
  useEffect(() => {
    const handleFocusOnInput = () => {
      // Small delay to ensure keyboard is fully shown (especially on mobile)
      setTimeout(scrollToBottom, 100)
    }

    // Set up event listeners for the input area
    const setupInputListeners = () => {
      // Input field
      const inputArea = document.querySelector('.nlux-composer-input')
      if (inputArea) {
        // Mouse/pointer events
        inputArea.addEventListener('focus', handleFocusOnInput)
        inputArea.addEventListener('click', handleFocusOnInput)
        
        // Touch events
        inputArea.addEventListener('touchstart', handleFocusOnInput, { passive: true })
        inputArea.addEventListener('touchend', handleFocusOnInput, { passive: true })
      }

      // Composer container - the parent container that wraps the entire input area
      const composerContainer = document.querySelector('.nlux-composer-container')
      if (composerContainer) {
        // Mouse/pointer events
        composerContainer.addEventListener('click', handleFocusOnInput)
        
        // Touch events
        composerContainer.addEventListener('touchstart', handleFocusOnInput, { passive: true })
        composerContainer.addEventListener('touchend', handleFocusOnInput, { passive: true })
      }

      // Composer - the direct input wrapper
      const composerArea = document.querySelector('.nlux-composer')
      if (composerArea) {
        // Mouse/pointer events
        composerArea.addEventListener('click', handleFocusOnInput)
        
        // Touch events
        composerArea.addEventListener('touchstart', handleFocusOnInput, { passive: true })
        composerArea.addEventListener('touchend', handleFocusOnInput, { passive: true })
      }

      // Also listen for taps on send button
      const sendButton = document.querySelector('.nlux-composer-send-button')
      if (sendButton) {
        sendButton.addEventListener('click', handleFocusOnInput)
        sendButton.addEventListener('touchstart', handleFocusOnInput, { passive: true })
        sendButton.addEventListener('touchend', handleFocusOnInput, { passive: true })
      }
    }

    if (isOpen) {
      // Add a delay to ensure the elements are in the DOM
      setTimeout(setupInputListeners, 500)
      
      // Re-check for elements periodically in case they load later
      const checkInterval = setInterval(() => {
        const composerExists = document.querySelector('.nlux-composer-container, .nlux-composer-input')
        if (composerExists) {
          setupInputListeners()
          clearInterval(checkInterval)
        }
      }, 500)
      
      // Clear interval after 5 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 5000)
    }

    return () => {
      // Clean up event listeners
      // Input field
      const inputArea = document.querySelector('.nlux-composer-input')
      if (inputArea) {
        // Mouse/pointer events
        inputArea.removeEventListener('focus', handleFocusOnInput)
        inputArea.removeEventListener('click', handleFocusOnInput)
        
        // Touch events
        inputArea.removeEventListener('touchstart', handleFocusOnInput)
        inputArea.removeEventListener('touchend', handleFocusOnInput)
      }

      // Composer container
      const composerContainer = document.querySelector('.nlux-composer-container')
      if (composerContainer) {
        composerContainer.removeEventListener('click', handleFocusOnInput)
        composerContainer.removeEventListener('touchstart', handleFocusOnInput)
        composerContainer.removeEventListener('touchend', handleFocusOnInput)
      }

      // Composer area
      const composerArea = document.querySelector('.nlux-composer')
      if (composerArea) {
        // Mouse/pointer events
        composerArea.removeEventListener('click', handleFocusOnInput)
        
        // Touch events
        composerArea.removeEventListener('touchstart', handleFocusOnInput)
        composerArea.removeEventListener('touchend', handleFocusOnInput)
      }

      // Remove send button listeners
      const sendButton = document.querySelector('.nlux-composer-send-button')
      if (sendButton) {
        sendButton.removeEventListener('click', handleFocusOnInput)
        sendButton.removeEventListener('touchstart', handleFocusOnInput)
        sendButton.removeEventListener('touchend', handleFocusOnInput)
      }
    }
  }, [isOpen, scrollToBottom])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      // Show the dialog as a modal
      dialog.showModal()
      // Prevent body scrolling
      document.body.style.overflow = 'hidden'
      
      // Initial scroll to bottom after modal opens
      // Use a longer timeout to ensure all content is rendered
      setTimeout(() => {
        scrollToBottom()
      }, 300)
    } else {
      // Close the dialog
      dialog.close()
      // Restore body scrolling
      document.body.style.overflow = ''
    }
  }, [isOpen, scrollToBottom])

  return (
    <dialog
      ref={dialogRef}
      className="mobile-chat-modal"
      onCancel={(e) => {
        e.preventDefault() // Prevent default close on ESC key
      }}
      onClick={(e) => {
        // Close if clicking on the backdrop (the dialog element itself)
        if (e.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="mobile-chat-content">
        <ChatHeader onClose={onClose} />
        <ChatInterface 
          className="mobile-chat-interface mobile-chat-bubbles"
        />
      </div>
    </dialog>
  )
}

export default MobileChatModal