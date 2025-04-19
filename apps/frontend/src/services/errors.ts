/**
 * Centralized error handling for Dialogue Foundry services
 * This file contains error classes, error codes, and error utilities
 * that can be used by various services across the application.
 */

// Base error class for all service errors
export class ServiceError extends Error {
  code: ErrorCodeValue
  recoverable: boolean
  statusCode?: number

  constructor(
    code: ErrorCodeValue,
    recoverable: boolean = false,
    statusCode?: number
  ) {
    super(getFriendlyErrorMessage(code))
    this.name = 'ServiceError'
    this.code = code
    this.recoverable = recoverable
    this.statusCode = statusCode
  }
}

// API-specific error class
export class ApiError extends ServiceError {
  constructor(code: ErrorCodeValue, recoverable: boolean = false) {
    super(code, recoverable)
    this.name = 'ApiError'
  }
}

// Streaming-specific error class
export class StreamingError extends ServiceError {
  constructor(code: ErrorCodeValue, recoverable: boolean = false) {
    super(code, recoverable)
    this.name = 'StreamingError'
  }
}

// Centralized error codes for services
export const ErrorCodes = {
  // Connection errors
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Authentication errors
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MISSING: 'TOKEN_MISSING',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  REQUEST_FAILED: 'REQUEST_FAILED',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  RECONNECT_LIMIT: 'RECONNECT_LIMIT',

  // Data errors
  PARSE_ERROR: 'PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Initialization errors
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  CHAT_CREATION_FAILED: 'CHAT_CREATION_FAILED',

  // Configuration errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CHAT: 'INVALID_CHAT',
  INVALID_COMPANY: 'INVALID_COMPANY',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',

  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

// Type definitions for error codes
export type ErrorCode = keyof typeof ErrorCodes
export type ErrorCodeValue = (typeof ErrorCodes)[ErrorCode]

/**
 * Type guard function to check if a string is a valid ErrorCode
 */
export function isErrorCode(code: string): code is ErrorCodeValue {
  return Object.values(ErrorCodes).includes(code as ErrorCodeValue)
}

// Error categories for UI handling
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  CONNECTION = 'connection',
  SERVER = 'server',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Utility function to categorize errors for UI handling
 * @param error Any error from the application
 * @returns ErrorCategory for consistent UI error display
 */
export function categorizeError(code: ErrorCodeValue | string): ErrorCategory {
  switch (code) {
    case ErrorCodes.TOKEN_INVALID:
    case ErrorCodes.TOKEN_EXPIRED:
    case ErrorCodes.TOKEN_MISSING:
    case ErrorCodes.AUTH_EXPIRED:
    case ErrorCodes.AUTH_FORBIDDEN:
      return ErrorCategory.AUTHENTICATION
    case ErrorCodes.CONNECTION_ERROR:
    case ErrorCodes.NETWORK_ERROR:
      return ErrorCategory.CONNECTION
    case ErrorCodes.SERVER_ERROR:
    case ErrorCodes.REQUEST_FAILED:
    case ErrorCodes.NOT_FOUND:
    case ErrorCodes.PARSE_ERROR:
      return ErrorCategory.SERVER
    case ErrorCodes.RATE_LIMITED:
    case ErrorCodes.RECONNECT_LIMIT:
      return ErrorCategory.RATE_LIMIT
    case ErrorCodes.TIMEOUT_ERROR:
      return ErrorCategory.TIMEOUT
    default:
      return ErrorCategory.UNKNOWN
  }
}

/**
 * Get a user-friendly error message based on error category
 * @param category Error category
 * @param customMessage Optional custom message to use instead of default
 */
export function getFriendlyErrorMessage(code: ErrorCodeValue | string): string {
  // Special case for token expired which should have a specific message
  if (code === ErrorCodes.TOKEN_EXPIRED) {
    return 'Your session has expired. Starting a new chat session.'
  }

  const category = categorizeError(code)

  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Your session has expired. Please refresh the page to continue.'

    case ErrorCategory.CONNECTION:
      return 'Unable to connect to the chat service. Please check your internet connection and try again.'

    case ErrorCategory.SERVER:
      return 'Our server is having trouble processing your request. Please try again in a moment.'

    case ErrorCategory.RATE_LIMIT:
      return "You've made too many requests. Please wait a moment before trying again."

    case ErrorCategory.TIMEOUT:
      return 'The request took too long to complete. Please try again.'

    case ErrorCategory.UNKNOWN:
    default:
      return 'Something went wrong. Please try again.'
  }
}
