import {
  extractTokenFromHeader,
  verifyToken,
  verifyAdminToken
} from '../lib/jwt-utils'
import { logger } from '../lib/logger'
import type * as express from 'express'

// Create a custom interface extending Express Request
export interface CustomRequest extends express.Request {
  user?: {
    userId: string
    chatId?: string
    isAdmin?: boolean
  }
}

/**
 * Helper function to extract token from query parameter
 * This is mainly used for EventSource connections where setting custom headers isn't possible
 */
const extractTokenFromQuery = (req: express.Request): string | undefined => {
  if (req.query && typeof req.query.token === 'string') {
    // Don't log the token for security reasons
    return req.query.token
  }
  return undefined
}

/**
 * Middleware to authenticate chat access using JWT token
 * Supports both Authorization header and token query parameter
 */
export const authenticateChatAccess = (
  req: CustomRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    let token: string | undefined
    let tokenSource = 'none'

    // First try to get token from header
    const authHeader = req.headers.authorization
    token = extractTokenFromHeader(authHeader)
    if (token) tokenSource = 'header'

    // If no token in header, try query parameter
    if (!token) {
      token = extractTokenFromQuery(req)
      if (token) tokenSource = 'query'
    }

    // If still no token, return authentication error
    if (!token) {
      logger.warn(`Authentication failed: No token provided in request`, {
        path: req.originalUrl,
        method: req.method
      })
      return res.status(401).json({
        error:
          'Authentication required. Provide a valid Bearer token or token parameter.',
        code: 'TOKEN_MISSING'
      })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      logger.warn(`Authentication failed: Invalid/expired token`, {
        tokenSource,
        path: req.originalUrl,
        method: req.method
      })
      return res.status(401).json({
        error:
          'Invalid or expired token. Please reinitialize your chat session.',
        code: 'TOKEN_INVALID'
      })
    }

    // Check if the requested chat ID matches the token's chat ID
    const { chatId } = req.params
    if (chatId && chatId !== payload.chatId) {
      logger.warn(`Chat access denied: Token chat ID mismatch`, {
        tokenChatId: payload.chatId,
        requestedChatId: chatId,
        userId: payload.userId
      })
      return res.status(403).json({
        error: 'You do not have access to this chat',
        code: 'CHAT_ACCESS_DENIED'
      })
    }

    // Add user info to request for future middleware/handlers using Object.assign
    Object.assign(req, {
      user: {
        userId: payload.userId,
        chatId: payload.chatId
      }
    })

    return next()
  } catch (error) {
    logger.error('Auth middleware error', {
      error: error as Error,
      path: req.originalUrl,
      method: req.method
    })
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    })
  }
}

/**
 * Middleware for routes that only need user authentication without specific chat access
 */
export const authenticateUser = (
  req: CustomRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization

    // Extract token from header
    const token = extractTokenFromHeader(authHeader)
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Provide a valid Bearer token.'
      })
    }

    // Verify token
    const payload = verifyToken(token)
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Add user info to request for future middleware/handlers using Object.assign
    Object.assign(req, {
      user: {
        userId: payload.userId,
        chatId: payload.chatId
      }
    })

    return next()
  } catch (error) {
    logger.error('User auth middleware error', {
      error: error as Error,
      path: req.originalUrl,
      method: req.method
    })
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Middleware for routes that require admin privileges
 * This is used for system configuration and management routes
 * Admin tokens are created separately from regular chat access tokens
 */
export const authenticateAdmin = (
  req: CustomRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization

    // Try the password-based authentication first
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword && req.headers['x-admin-key'] === adminPassword) {
      // Add admin info to request
      Object.assign(req, {
        user: {
          userId: 'admin-user',
          isAdmin: true
        }
      })
      return next()
    }

    // If password auth fails, try JWT token auth
    const token = extractTokenFromHeader(authHeader)
    if (!token) {
      return res.status(401).json({
        error:
          'Admin authentication required. Provide a valid Bearer token or admin key.'
      })
    }

    // Verify admin token
    const payload = verifyAdminToken(token)
    if (!payload) {
      return res.status(403).json({
        error:
          'Admin privileges required. Regular user tokens are not accepted for this operation.'
      })
    }

    // Add admin info to request for future middleware/handlers
    Object.assign(req, {
      user: {
        userId: payload.userId,
        isAdmin: true
      }
    })

    return next()
  } catch (error) {
    logger.error('Admin auth middleware error', {
      error: error as Error,
      path: req.originalUrl,
      method: req.method
    })
    return res.status(500).json({ error: 'Admin authentication failed' })
  }
}
