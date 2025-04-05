import { useState, useEffect, useCallback } from 'react'
import debounce from 'lodash/debounce'

/**
 * Custom hook to track window dimensions and respond to resize events
 * Returns the current width and height of the window with debouncing
 * @param delay Debounce delay in milliseconds (default: 200ms)
 */
export const useResizeObserver = (delay = 10) => {
  // Initialize with current window dimensions
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  // Create a debounced update function using lodash debounce
  // We use useCallback to memoize the debounced function
  const debouncedUpdateDimensions = useCallback(
    debounce(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }, delay),
    [delay]
  )

  useEffect(() => {
    // Add event listener for window resize
    window.addEventListener('resize', debouncedUpdateDimensions)
    
    // Cleanup event listener on unmount
    return () => {
      // Remove the event listener
      window.removeEventListener('resize', debouncedUpdateDimensions)
      
      // Cancel any pending debounced calls
      debouncedUpdateDimensions.cancel()
    }
  }, [debouncedUpdateDimensions])

  return dimensions
}