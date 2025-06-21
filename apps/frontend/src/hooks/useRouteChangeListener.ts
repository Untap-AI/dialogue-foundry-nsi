import { useEffect } from 'react'

/**
 * Calls the callback whenever the URL changes via pushState, replaceState, or popstate.
 */
export function useRouteChangeListener(callback: () => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleRouteChange = () => callback()

    // Patch pushState and replaceState to emit a custom event
    const patchHistoryMethod = (method: 'pushState' | 'replaceState') => {
      const original = window.history[method]
      window.history[method] = function (...args) {
        const result = original.apply(this, args)
        window.dispatchEvent(new Event('locationchange'))
        return result
      }
    }
    patchHistoryMethod('pushState')
    patchHistoryMethod('replaceState')

    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('locationchange', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('locationchange', handleRouteChange)
    }
  }, [callback])
} 