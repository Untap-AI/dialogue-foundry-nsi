import * as Sentry from '@sentry/node'
import dotenv from 'dotenv'

dotenv.config()

// Environment detection
const environment = process.env.DEPLOYMENT_ENV || 'development'
const isDevelopment = environment === 'development'
const isSmokebox = environment === 'smokebox'
const isProduction = environment === 'production'

// Only initialize Sentry in non-dev environments
if (!isDevelopment) {
  const dsn = process.env.SENTRY_DSN

  if (!dsn && (isProduction || isSmokebox)) {
    console.warn(
      'SENTRY_DSN is not defined in environment variables. Error tracking will be disabled.'
    )
  }

  // Initialize Sentry with basic configuration
  Sentry.init({
    dsn,
    environment,
    enabled: !!dsn && !isDevelopment,
    // Simplified config without problematic integrations
    tracesSampleRate: isSmokebox ? 1.0 : 0.2
  })

  // Log captured console errors to Sentry manually instead of using the integration
  const originalConsoleError = console.error
  console.error = (...args: unknown[]): void => {
    // Call the original console.error
    originalConsoleError(...args)

    // If this is an Error object, capture it in Sentry
    if (args[0] instanceof Error && !isDevelopment) {
      Sentry.captureException(args[0])
    }
  }
}

// Type for error object
type ErrorWithStackAndMetadata = Error & {
  stack?: string
  metadata?: Record<string, unknown>
  statusCode?: number
}

/**
 * Structured logger that integrates with Sentry
 */
class Logger {
  /**
   * Log a debug message - only sent to Sentry in smokebox environment
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    console.debug(message, metadata || '')

    // Only send debug logs to Sentry in smokebox environment
    if (isSmokebox && !isDevelopment) {
      Sentry.captureMessage(message, {
        level: 'debug',
        extra: metadata
      })
    }
  }

  /**
   * Log an info message - not sent to Sentry
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    console.info(message, metadata || '')
  }

  /**
   * Log a warning message - sent to Sentry in production and smokebox
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    console.warn(message, metadata || '')

    if (!isDevelopment) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: metadata
      })
    }
  }

  /**
   * Log an error - sent to Sentry in production and smokebox
   * @param error Error object or error message
   * @param metadata Additional context for the error
   */
  error(
    error: ErrorWithStackAndMetadata | string,
    metadata?: Record<string, unknown>
  ): void {
    if (typeof error === 'string') {
      console.error(error, metadata || '')

      if (!isDevelopment) {
        Sentry.captureMessage(error, {
          level: 'error',
          extra: metadata
        })
      }
    } else {
      // Extract metadata from error object if it exists
      const combinedMetadata = {
        ...(error.metadata || {}),
        ...(metadata || {})
      }

      console.error(error.message, error.stack || '', combinedMetadata)

      if (!isDevelopment) {
        Sentry.captureException(error, {
          extra: combinedMetadata
        })
      }
    }
  }

  /**
   * Add context to Sentry for the current session/request
   */
  setContext(contextName: string, context: Record<string, unknown>): void {
    if (!isDevelopment) {
      Sentry.setContext(contextName, context)
    }
  }

  /**
   * Set user information for better error tracking
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!isDevelopment) {
      Sentry.setUser(user)
    }
  }
}

export const logger = new Logger()
