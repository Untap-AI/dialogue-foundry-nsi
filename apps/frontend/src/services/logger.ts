import * as Sentry from '@sentry/react'
import { categorizeError } from './errors'
import type { ErrorCodeValue } from './errors'

// Environment type for better type safety
type Environment = 'development' | 'production' | string

// Default configuration with sensible values
const DEFAULT_CONFIG = {
  dsn: '', // Empty string as default DSN
  environment: import.meta.env.PROD ? 'production' : 'development',
  release: 'development',
  debug: false,
  // Only enable in production environments
  enabled: import.meta.env.PROD,
  // In production, show only errors
  consoleLevel: import.meta.env.PROD ? 'error' : ('info' as LogLevel)
}

// Supported log levels
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal'

// Logger configuration interface
interface LoggerConfig {
  dsn?: string
  environment?: Environment
  release?: string
  debug?: boolean
  enabled?: boolean
  consoleLevel?: LogLevel
}

// Error metadata for additional context
interface ErrorMetadata {
  [key: string]: unknown
}

// Logger class for handling logs and errors
class Logger {
  private static instance: Logger
  private config: LoggerConfig
  private initialized: boolean = false

  // Map log levels to Sentry severity levels
  private readonly severityMap: Record<LogLevel, Sentry.SeverityLevel> = {
    debug: 'debug',
    info: 'info',
    warning: 'warning',
    error: 'error',
    fatal: 'fatal'
  }

  // Map log levels to console methods with proper typing
  private readonly consoleMethods: Record<LogLevel, keyof Console> = {
    debug: 'debug',
    info: 'info',
    warning: 'warn',
    error: 'error',
    fatal: 'error'
  }

  // Level priorities for filtering console output
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warning: 2,
    error: 3,
    fatal: 4
  }

  private constructor() {
    this.config = { ...DEFAULT_CONFIG }
  }

  /**
   * Get the logger instance (singleton)
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Get the current environment
   */
  public getEnvironment(): Environment {
    return this.config.environment || DEFAULT_CONFIG.environment
  }

  /**
   * Check if we're in production environment
   */
  public isProduction(): boolean {
    return this.getEnvironment() === 'production'
  }

  /**
   * Check if we're in development environment
   */
  public isDevelopment(): boolean {
    return this.getEnvironment() === 'development'
  }

  /**
   * Initialize Sentry with the provided configuration
   */
  public initialize(config: LoggerConfig = {}): void {
    if (this.initialized) {
      console.warn('Logger already initialized')
      return
    }

    // Merge provided config with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    }

    // Skip initialization if logging is disabled or no DSN is provided
    if (!this.config.enabled || !this.config.dsn) {
      console.info(
        `Sentry ${!this.config.enabled ? 'disabled' : 'no DSN provided'} for environment: ${this.config.environment}`
      )
      return
    }

    try {
      // Initialize Sentry with appropriate options
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,
        debug: this.config.debug,

        // Performance monitoring using modern Sentry API
        integrations: [Sentry.browserTracingIntegration()],

        // Error processing
        beforeSend: event => {
          // Add useful application state if available
          try {
            if (typeof window !== 'undefined') {
              // Create a new event object instead of modifying the original
              return {
                ...event,
                tags: {
                  ...event.tags,
                  screen_width: window.innerWidth,
                  screen_height: window.innerHeight,
                  url_path: window.location.pathname
                }
              }
            }
          } catch (e) {
            // Ignore any errors here
          }
          return event
        }
      })

      // Add default tags
      Sentry.setTag('app_version', this.config.release || 'unknown')
      Sentry.setTag('environment', this.config.environment || 'development')

      this.initialized = true

      // Note: Global error handlers are disabled to only capture explicit logger usage
      // If you need global error handling, uncomment the code below:
      /*
      // Set a global error handler for uncaught exceptions
      if (typeof window !== 'undefined') {
        window.onerror = (message, _source, _lineno, _colno, error) => {
          if (error) {
            this.captureException(error, {
              source: 'window.onerror',
              message: message?.toString() || 'Unknown error'
            })
          }
          return false
        }

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', event => {
          this.captureException(
            event.reason || new Error('Unhandled Promise rejection'),
            {
              source: 'unhandledrejection',
              message: event.reason?.message || 'Unknown promise rejection'
            }
          )
        })
      }
      */
    } catch (error) {
      console.error('Failed to initialize Sentry:', error)
    }
  }

  /**
   * Log a debug message
   */
  public debug(message: string, metadata?: ErrorMetadata): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log an info message
   */
  public info(message: string, metadata?: ErrorMetadata): void {
    this.log('info', message, metadata)
  }

  /**
   * Log a warning message
   */
  public warning(message: string, metadata?: ErrorMetadata): void {
    this.log('warning', message, metadata)
  }

  /**
   * Log an error message
   */
  public error(message: string, metadata?: ErrorMetadata): void {
    this.log('error', message, metadata)
  }

  /**
   * Log a fatal error message
   */
  public fatal(message: string, metadata?: ErrorMetadata): void {
    this.log('fatal', message, metadata)
  }

  /**
   * Capture a JavaScript error
   */
  public captureException(error: Error, metadata?: ErrorMetadata): void {
    if (!this.config.enabled) {
      // Always log errors to console regardless of environment
      console.error(error.message, { error, ...(metadata || {}) })
      return
    }

    // Add metadata to Sentry scope
    Sentry.withScope(scope => {
      if (metadata) {
        // Add all metadata as tags or extra context
        Object.entries(metadata).forEach(([key, value]) => {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            scope.setTag(key, String(value))
          } else {
            scope.setExtra(key, value)
          }
        })
      }

      // Add error category if it's our custom error
      if ('code' in error && typeof error.code === 'string') {
        const category = categorizeError(error.code as ErrorCodeValue)
        scope.setTag('errorCategory', category)
        scope.setTag('errorCode', error.code)
      }

      // Set severity level
      scope.setLevel(this.severityMap.error)

      // Capture the exception with Sentry
      Sentry.captureException(error)
    })

    // Also log to console
    if (this.shouldLogToConsole('error')) {
      console.error(error.message, { error, ...(metadata || {}) })
    }
  }

  /**
   * Capture a custom event
   */
  public captureEvent(eventName: string, metadata?: ErrorMetadata): void {
    if (!this.config.enabled) {
      // Log to console based on current console level
      if (this.shouldLogToConsole('info')) {
        console.info(eventName, metadata || {})
      }
      return
    }

    // Capture event with Sentry
    Sentry.captureMessage(eventName, {
      level: 'info',
      extra: metadata
    })

    // Also log to console
    if (this.shouldLogToConsole('info')) {
      console.info(eventName, metadata || {})
    }
  }

  /**
   * Set user information for error tracking
   */
  public setUser(user: Sentry.User | null): void {
    if (!this.config.enabled) return
    Sentry.setUser(user)
  }

  /**
   * Set a global tag for all events
   */
  public setTag(key: string, value: string): void {
    if (!this.config.enabled) return
    Sentry.setTag(key, value)
  }

  /**
   * Add a breadcrumb for tracking user actions
   */
  public addBreadcrumb(
    type: string,
    message: string,
    metadata?: ErrorMetadata
  ): void {
    if (!this.config.enabled) return

    Sentry.addBreadcrumb({
      type,
      message,
      data: metadata,
      level: 'info'
    })
  }

  /**
   * Internal method to log messages at different levels
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: ErrorMetadata
  ): void {
    // If disabled, log to console based on environment and level
    if (!this.config.enabled) {
      if (this.isDevelopment() || level === 'error' || level === 'fatal') {
        const method = this.consoleMethods[level]
        if (method && typeof console[method] === 'function') {
          (console[method] as (...args: unknown[]) => void)(
            message,
            metadata || {}
          )
        }
      }
      return
    }

    // Add breadcrumb for the log
    this.addBreadcrumb('log', message, { level, ...metadata })

    // Send to Sentry
    Sentry.captureMessage(message, {
      level: this.severityMap[level],
      extra: metadata
    })

    // Log to console if appropriate for the configured console level
    if (this.shouldLogToConsole(level)) {
      const method = this.consoleMethods[level]
      if (method && typeof console[method] === 'function') {
        (console[method] as (...args: unknown[]) => void)(
          message,
          metadata || {}
        )
      }
    }
  }

  /**
   * Determine if a message at the given level should be logged to console
   */
  private shouldLogToConsole(level: LogLevel): boolean {
    const configLevel = this.config.consoleLevel || 'error'
    return this.levelPriority[level] >= this.levelPriority[configLevel]
  }

  /**
   * Flush any pending events before application terminates
   */
  public async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.config.enabled) return false

    try {
      return await Sentry.flush(timeout)
    } catch (e) {
      console.error('Error flushing Sentry events:', e)
      return false
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Convenience function to initialize logger with application config
export function initLogger(config: LoggerConfig): void {
  logger.initialize(config)
}