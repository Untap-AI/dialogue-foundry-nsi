import { useState, useEffect } from 'react'
import { useConfig } from '../contexts/ConfigContext'
import { logger } from '../services/logger'

export type AvailabilityStatus = 'checking' | 'available' | 'unavailable'

/**
 * Checks whether the bot is currently within its configured active hours.
 *
 * Fails open: if the availability check errors out for any reason, the bot is
 * treated as available so a transient backend issue never hides the widget.
 */
export function useChatAvailability(): AvailabilityStatus {
  const { chatConfig } = useConfig()
  const { apiBaseUrl, companyId } = chatConfig
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>('checking')

  useEffect(() => {
    let cancelled = false

    const checkAvailability = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/chats/availability?companyId=${encodeURIComponent(
            companyId
          )}`
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
        logger.warning(
          'Failed to check chat availability, defaulting to available',
          {
            error
          }
        )
        if (!cancelled) setAvailabilityStatus('available')
      }
    }

    checkAvailability()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, companyId])

  return availabilityStatus
}
