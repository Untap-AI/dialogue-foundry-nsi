import Honeybadger from '@honeybadger-io/js'
import dotenv from 'dotenv'

dotenv.config()

// Environment detection
const environment = process.env.DEPLOYMENT_ENV || 'development'
const isDevelopment = environment === 'development'
const isSmokebox = environment === 'smokebox'
const isProduction = environment === 'production'

// Only initialize Honeybadger in non-dev environments
if (!isDevelopment) {
  const apiKey = process.env.HONEYBADGER_API_KEY

  if (!apiKey && (isProduction || isSmokebox)) {
    console.warn(
      'HONEYBADGER_API_KEY is not defined in environment variables. Error tracking will be disabled.'
    )
  }

  // Initialize Honeybadger with basic configuration
  Honeybadger.configure({
    apiKey: apiKey || '',
    environment,
    developmentEnvironments: ['development'],
    enableUncaught: false, // We'll handle errors manually
    enableUnhandledRejection: false // We'll handle rejections manually
  })
}

// Type for error object
type ErrorWithStackAndMetadata = Error & {
  stack?: string
  metadata?: Record<string, unknown>
  statusCode?: number
}

/**
 * Structured logger that integrates with Honeybadger
 */
class Logger {
  /**
   * Log a debug message - only sent to Honeybadger in smokebox environment
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    console.debug(message, metadata || '')

    // Only send debug logs to Honeybadger in smokebox environment
    if (isSmokebox && !isDevelopment) {
      Honeybadger.notify(message, {
        context: metadata
      })
    }
  }

  /**
   * Log an info message - not sent to Honeybadger
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    console.info(message, metadata || '')
  }

  /**
   * Log a warning message - sent to Honeybadger in production and smokebox
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    console.warn(message, metadata || '')

    if (!isDevelopment) {
      Honeybadger.notify(message, {
        context: metadata
      })
    }
  }

  /**
   * Log an error - sent to Honeybadger in production and smokebox
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
        Honeybadger.notify(error, {
          context: metadata
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
        Honeybadger.notify(error, {
          context: combinedMetadata
        })
      }
    }
  }

  /**
   * Add context to Honeybadger for the current session/request
   */
  setContext(contextName: string, context: Record<string, unknown>): void {
    if (!isDevelopment) {
      Honeybadger.setContext({
        [contextName]: context
      })
    }
  }

  /**
   * Set user information for better error tracking
   */
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!isDevelopment) {
      Honeybadger.setContext({
        user
      })
    }
  }
}

export const logger = new Logger()
