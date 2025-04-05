import { useCallback, useEffect, useRef } from 'react'

interface UseChatScrollOptions {
  // Whether the chat interface is open/visible
  isOpen: boolean
}

/**
 * Custom hook to handle chat scrolling functionality
 * Manages touch listeners and resize observers to ensure the chat stays scrolled to bottom
 */
export const useChatScroll = ({ isOpen }: UseChatScrollOptions) => {
  // Store the resize observer reference
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

  // Set up touch event listeners for the input area
  useEffect(() => {
    const handleTouch = () => {
      // Small delay to ensure keyboard is fully shown (especially on mobile)
      setTimeout(scrollToBottom, 100)
    }

    // Set up event listeners for the input area
    const setupTouchListeners = () => {
      // Composer container - the parent container that wraps the entire input area
      const composerContainer = document.querySelector('.nlux-composer-container')
      if (composerContainer) {
        composerContainer.addEventListener('touchstart', handleTouch, { passive: true })
      }
    }

    if (isOpen) {
      // Add a delay to ensure the elements are in the DOM
      setTimeout(setupTouchListeners, 500)
      
      // Re-check for elements periodically in case they load later
      const checkInterval = setInterval(() => {
        const composerExists = document.querySelector('.nlux-composer-container, .nlux-composer-input')
        if (composerExists) {
          setupTouchListeners()
          clearInterval(checkInterval)
        }
      }, 500)
      
      // Clear interval after 5 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 5000)
    }

    return () => {
      // Composer container
      const composerContainer = document.querySelector('.nlux-composer-container')
      if (composerContainer) {
        composerContainer.removeEventListener('touchstart', handleTouch)
      }
    }
  }, [isOpen, scrollToBottom])

  // Return the scrollToBottom function so it can be called from the component
  return {
    scrollToBottom
  }
}

export default useChatScroll 