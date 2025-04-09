/**
 * Centralized error handling for Dialogue Foundry services
 * This file contains error classes, error codes, and error utilities
 * that can be used by various services across the application.
 */

// Base error class for all service errors
export class ServiceError extends Error {
  code: string;
  recoverable: boolean;
  statusCode?: number;
  
  constructor(message: string, code: string, recoverable: boolean = false, statusCode?: number) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.recoverable = recoverable;
    this.statusCode = statusCode;
  }
}

// API-specific error class
export class ApiError extends ServiceError {
  constructor(message: string, code: string, recoverable: boolean = false, statusCode?: number) {
    super(message, code, recoverable, statusCode);
    this.name = 'ApiError';
  }
}

// Streaming-specific error class
export class StreamingError extends ServiceError {
  constructor(message: string, code: string, recoverable: boolean = false) {
    super(message, code, recoverable);
    this.name = 'StreamingError';
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
};

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
export function categorizeError(error: Error): ErrorCategory {
  // Handle ServiceError types first
  if (error instanceof ServiceError) {
    const { code } = error;
    
    // Authentication errors
    if ([
      ErrorCodes.TOKEN_INVALID,
      ErrorCodes.TOKEN_MISSING,
      ErrorCodes.AUTH_EXPIRED,
      ErrorCodes.AUTH_FORBIDDEN
    ].includes(code)) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    // Connection errors
    if ([
      ErrorCodes.CONNECTION_ERROR,
      ErrorCodes.NETWORK_ERROR
    ].includes(code)) {
      return ErrorCategory.CONNECTION;
    }
    
    // Server errors
    if ([
      ErrorCodes.SERVER_ERROR,
      ErrorCodes.REQUEST_FAILED,
      ErrorCodes.NOT_FOUND,
      ErrorCodes.PARSE_ERROR
    ].includes(code)) {
      return ErrorCategory.SERVER;
    }
    
    // Rate limit errors
    if ([
      ErrorCodes.RATE_LIMITED,
      ErrorCodes.RECONNECT_LIMIT
    ].includes(code)) {
      return ErrorCategory.RATE_LIMIT;
    }
    
    // Timeout errors
    if (code === ErrorCodes.TIMEOUT_ERROR) {
      return ErrorCategory.TIMEOUT;
    }
  }
  
  // Fallback to checking error message text
  const message = error.message.toLowerCase();
  
  if (message.includes('token') || 
      message.includes('authentication') || 
      message.includes('auth') || 
      message.includes('session')) {
    return ErrorCategory.AUTHENTICATION;
  } 
  
  if (message.includes('network') || 
      message.includes('connection') || 
      message.includes('offline') || 
      message.includes('unable to connect')) {
    return ErrorCategory.CONNECTION;
  } 
  
  if (message.includes('server') || 
      message.includes('500') || 
      message.includes('404') || 
      message.includes('503')) {
    return ErrorCategory.SERVER;
  } 
  
  if (message.includes('rate') || 
      message.includes('limit') || 
      message.includes('too many')) {
    return ErrorCategory.RATE_LIMIT;
  } 
  
  if (message.includes('timeout') || 
      message.includes('timed out')) {
    return ErrorCategory.TIMEOUT;
  }
  
  return ErrorCategory.UNKNOWN;
}

/**
 * Get a user-friendly error message based on error category
 * @param category Error category
 * @param customMessage Optional custom message to use instead of default
 */
export function getFriendlyErrorMessage(category: ErrorCategory, customMessage?: string): string {
  if (customMessage) return customMessage;
  
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Your session has expired. Please refresh the page to continue.';
    
    case ErrorCategory.CONNECTION:
      return 'Unable to connect to the chat service. Please check your internet connection and try again.';
    
    case ErrorCategory.SERVER:
      return 'Our server is having trouble processing your request. Please try again in a moment.';
    
    case ErrorCategory.RATE_LIMIT:
      return 'You\'ve made too many requests. Please wait a moment before trying again.';
    
    case ErrorCategory.TIMEOUT:
      return 'The request took too long to complete. Please try again.';
    
    case ErrorCategory.UNKNOWN:
    default:
      return 'Something went wrong. Please try again.';
  }
} 