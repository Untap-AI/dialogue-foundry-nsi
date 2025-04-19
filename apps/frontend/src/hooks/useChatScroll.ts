import { useEffect } from 'react'

interface UseChatScrollOptions {
  // Whether the chat interface is open/visible
  isOpen: boolean
}

const scrollToBottomSmooth = () => {
  const conversationContainer = document.querySelector(
    '.nlux-conversation-container'
  )
  if (conversationContainer && conversationContainer instanceof HTMLElement) {
    conversationContainer.scrollTo({
      top: conversationContainer.scrollHeight,
      behavior: 'smooth'
    })
  }
}

/**
 * Custom hook to handle chat scrolling functionality
 * Manages touch, click, and focus listeners and resize observers to ensure the chat stays scrolled to bottom
 */
export const useChatScroll = ({ isOpen }: UseChatScrollOptions) => {
  useEffect(() => {
    // Initial scroll to bottom after modal opens
    if (isOpen) {
      setTimeout(() => {
        scrollToBottomSmooth()
      }, 300)
    }
  }, [isOpen])

  // Set up interaction event listeners (touch, click, focus) for the input area
  useEffect(() => {
    // Handler function for all interaction events
    const handleInteraction = () => setTimeout(scrollToBottomSmooth, 100)

    // Set up event listeners for the input area
    const setupInteractionListeners = () => {
      // Composer container - the parent container that wraps the entire input area
      const composerContainer = document.querySelector(
        '.nlux-composer-container'
      )

      // Composer input - the actual input element where users type
      const composerInput = document.querySelector('.nlux-composer-input')

      if (composerContainer) {
        // Touch events (for mobile)
        composerContainer.addEventListener('touchstart', handleInteraction, {
          passive: true
        })

        // Click events (for desktop)
        composerContainer.addEventListener('click', handleInteraction, {
          passive: true
        })
      }

      if (composerInput) {
        // Focus events (when input gets focus)
        composerInput.addEventListener('focus', handleInteraction, {
          passive: true
        })
      }
    }

    if (isOpen) {
      // Add a delay to ensure the elements are in the DOM
      setTimeout(setupInteractionListeners, 500)

      // Re-check for elements periodically in case they load later
      const checkInterval = setInterval(() => {
        const composerExists = document.querySelector(
          '.nlux-composer-container, .nlux-composer-input'
        )
        if (composerExists) {
          setupInteractionListeners()
          clearInterval(checkInterval)
        }
      }, 500)

      // Clear interval after 5 seconds to avoid infinite checking
      setTimeout(() => clearInterval(checkInterval), 5000)
    }

    return () => {
      // Clean up all event listeners on unmount
      const composerContainer = document.querySelector(
        '.nlux-composer-container'
      )

      const composerInput = document.querySelector('.nlux-composer-input')

      if (composerContainer) {
        composerContainer.removeEventListener('touchstart', handleInteraction)
        composerContainer.removeEventListener('click', handleInteraction)
      }

      if (composerInput) {
        composerInput.removeEventListener('focus', handleInteraction)
      }
    }
  }, [isOpen])
}
