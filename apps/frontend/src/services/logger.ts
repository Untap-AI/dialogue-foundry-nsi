import Honeybadger from '@honeybadger-io/js'
import { categorizeError } from './errors'
import type { ErrorCodeValue } from './errors'

// Simple metadata type
type Metadata = Record<string, any>

// Initialize Honeybadger once
let initialized = false

/**
 * Initialize the logger with Honeybadger configuration
 * Only enabled in production, manual error tracking only
 */
export function initLogger(config: { apiKey?: string } = {}): void {
  if (initialized) {
    console.warn('Logger already initialized')
    return
  }

  const isProduction = import.meta.env.PROD
  const apiKey = config.apiKey

  // Skip initialization if not production or no API key
  if (!isProduction || !apiKey) {
    console.info(
      `Honeybadger ${!isProduction ? 'disabled (dev mode)' : 'disabled (no API key)'}`
    )
    initialized = true
    return
  }

  try {
    Honeybadger.configure({
      apiKey,
      environment: 'production',
      enableUncaught: false, // Manual tracking only
      enableUnhandledRejection: false,
      breadcrumbsEnabled: false
    })
    initialized = true
  } catch (error) {
    console.error('Failed to initialize Honeybadger:', error)
  }
}

/**
 * Log a debug message (console only, not sent to Honeybadger)
 */
export function debug(message: string, metadata?: Metadata): void {
  console.debug(message, metadata || '')
}

/**
 * Log a warning message
 */
export function warning(message: string, metadata?: Metadata): void {
  console.warn(message, metadata || '')
  
  if (import.meta.env.PROD && initialized) {
    Honeybadger.notify(message, { context: { level: 'warning', ...metadata } })
  }
}

/**
 * Log an error message
 */
export function error(message: string | Error, metadata?: Metadata): void {
  if (typeof message === 'string') {
    console.error(message, metadata || '')
    
    if (import.meta.env.PROD && initialized) {
      Honeybadger.notify(message, { context: { level: 'error', ...metadata } })
    }
  } else {
    // It's an Error object
    captureException(message, metadata)
  }
}

/**
 * Capture an Error object with context
 */
export function captureException(err: Error, metadata?: Metadata): void {
  const context: Metadata = { ...(metadata || {}) }

  // Add error category if it's a custom error with a code
  if ('code' in err && typeof err.code === 'string') {
    const category = categorizeError(err.code as ErrorCodeValue)
    context.errorCategory = category
    context.errorCode = err.code
  }

  console.error(err.message, { error: err, ...context })

  if (import.meta.env.PROD && initialized) {
    Honeybadger.notify(err, { context })
  }
}

// Export as logger object for compatibility with existing code
export const logger = {
  debug,
  warning,
  error,
  captureException
}