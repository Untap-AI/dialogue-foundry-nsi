import type { Tables } from '../../types/database'

type ChatConfig = Tables<'chat_configs'>

type ActiveHoursConfig = Pick<
  ChatConfig,
  'timezone' | 'active_start_time' | 'active_end_time'
>

/**
 * Convert a "HH:MM" / "HH:MM:SS" time string into minutes since midnight.
 * Returns undefined if the value can't be parsed.
 */
const timeStringToMinutes = (time: string): number | undefined => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!match) return undefined

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 24 ||
    minutes > 59
  ) {
    return undefined
  }

  return hours * 60 + minutes
}

/**
 * Get the current minutes-since-midnight in the given IANA timezone.
 * Falls back to undefined if the timezone is invalid.
 */
const currentMinutesInTimezone = (timezone: string): number | undefined => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).formatToParts(new Date())

    const hourPart = parts.find(part => part.type === 'hour')?.value
    const minutePart = parts.find(part => part.type === 'minute')?.value

    if (hourPart === undefined || minutePart === undefined) return undefined

    // Intl can emit "24" for midnight in some environments; normalize to 0.
    const hours = Number(hourPart) % 24
    const minutes = Number(minutePart)

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined

    return hours * 60 + minutes
  } catch {
    return undefined
  }
}

/**
 * Determine whether the bot is currently within its configured active hours.
 *
 * The bot is always considered active unless ALL of timezone, active_start_time,
 * and active_end_time are configured. Supports overnight windows where the start
 * time is later than the end time (e.g. 17:00 -> 09:00).
 *
 * Any misconfiguration (unparseable times, invalid timezone) fails open so the
 * bot stays available rather than silently going dark.
 */
export const isBotActive = (config: ActiveHoursConfig): boolean => {
  const { timezone, active_start_time, active_end_time } = config

  if (!timezone || !active_start_time || !active_end_time) {
    return true
  }

  const start = timeStringToMinutes(active_start_time)
  const end = timeStringToMinutes(active_end_time)
  const now = currentMinutesInTimezone(timezone)

  if (start === undefined || end === undefined || now === undefined) {
    return true
  }

  // Equal start/end is treated as always active.
  if (start === end) {
    return true
  }

  if (start < end) {
    // Same-day window, e.g. 09:00 -> 17:00.
    return now >= start && now < end
  }

  // Overnight window, e.g. 17:00 -> 09:00.
  return now >= start || now < end
}
