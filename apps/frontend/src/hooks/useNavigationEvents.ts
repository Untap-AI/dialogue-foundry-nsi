import { useEffect } from 'react'

/**
 * Calls the provided callback whenever navigation occurs in an SPA, including:
 * - pushState
 * - replaceState
 * - popstate (back/forward)
 * - hashchange
 */
export function useNavigationEvents(callback: () => void) {
  useEffect(() => {
    const handleNavigation = () => {
      callback()
    }

    window.addEventListener('popstate', handleNavigation)
    window.addEventListener('hashchange', handleNavigation)

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args)
      handleNavigation()
    }
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      handleNavigation()
    }

    return () => {
      window.removeEventListener('popstate', handleNavigation)
      window.removeEventListener('hashchange', handleNavigation)
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
    }
  }, [callback])
} 