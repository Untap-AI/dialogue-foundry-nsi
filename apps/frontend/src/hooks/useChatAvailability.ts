import { useState, useEffect } from 'react'
import { useConfig } from '../contexts/ConfigContext'
import { logger } from '../services/logger'

export type AvailabilityStatus = 'checking' | 'available' | 'unavailable'

// Cap how long we'll wait for the availability check before failing open. A
// hung backend must never leave the widget stuck invisible for always-on bots.
const AVAILABILITY_TIMEOUT_MS = 5000

/**
 * Checks whether the bot is currently within its configured active hours.
 *
 * Fails open: if the availability check errors out, times out, or returns an
 * error status, the bot is treated as available so a transient backend issue
 * never hides the widget.
 */
export function useChatAvailability(): AvailabilityStatus {
  const { chatConfig } = useConfig()
  const { apiBaseUrl, companyId } = chatConfig
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>('checking')

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      AVAILABILITY_TIMEOUT_MS
    )

    const checkAvailability = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/chats/availability?companyId=${encodeURIComponent(
            companyId
          )}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          if (!cancelled) setAvailabilityStatus('available')
          return
        }

        const data = await response.json()
        if (!cancelled) {
          setAvailabilityStatus(
            data.available === false ? 'unavailable' : 'available'
          )
        }
      } catch (error) {
        // Aborts from unmount/cleanup are expected — don't log or update state.
        if (cancelled) return
        logger.warning(
          'Failed to check chat availability, defaulting to available',
          {
            error
          }
        )
        setAvailabilityStatus('available')
      } finally {
        clearTimeout(timeoutId)
      }
    }

    checkAvailability()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [apiBaseUrl, companyId])

  return availabilityStatus
}
