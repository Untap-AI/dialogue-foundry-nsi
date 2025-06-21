import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

// Get JWT secret from environment variables or use a default for development
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'super-secret-jwt-token-with-at-least-32-characters-long'
const TOKEN_EXPIRY = process.env.JWT_EXPIRY
  ? parseInt(process.env.JWT_EXPIRY)
  : 86400 * 0.5 // 30 days in seconds

// Admin-specific JWT settings
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  `${JWT_SECRET}-admin-extension-key-do-not-use-in-production`
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_JWT_EXPIRY
  ? parseInt(process.env.ADMIN_JWT_EXPIRY)
  : 86400 * 30 // 30 days in seconds

interface ChatAccessPayload {
  chatId: string
  userId: string
  iat?: number
  exp?: number
}

interface AdminAccessPayload {
  userId: string
  isAdmin: true
  iat?: number
  exp?: number
}

// Result types for token verification with expiration differentiation
interface TokenVerificationResult<T> {
  expired: boolean
  payload: T
}

/**
 * Generate a JWT token for chat access
 * @param chatId - The ID of the chat
 * @param userId - The ID of the user
 * @returns JWT token
 */
export const generateChatAccessToken = (
  chatId: string,
  userId: string
): string => {
  const payload: ChatAccessPayload = {
    chatId,
    userId
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY
  })
}

/**
 * Generate a JWT token for admin access
 * @param userId - The ID of the admin user
 * @returns JWT token for admin access
 */
export const generateAdminAccessToken = (userId: string): string => {
  const payload: AdminAccessPayload = {
    userId,
    isAdmin: true
  }

  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_TOKEN_EXPIRY
  })
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns The verification result or undefined if invalid
 */
export const verifyToken = (
  token: string
): TokenVerificationResult<ChatAccessPayload> | undefined => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ChatAccessPayload
    return {
      expired: false,
      payload
    }
  } catch (error) {
    // Check if the error is specifically a token expiration error
    if (error instanceof jwt.TokenExpiredError) {
      try {
        // Decode without verification to get the payload
        const payload = jwt.decode(token) as ChatAccessPayload
        return {
          expired: true,
          payload
        }
      } catch (decodeError) {
        // If even decoding fails, token is malformed
        return undefined
      }
    }
    return undefined
  }
}

/**
 * Verify and decode an admin JWT token
 * @param token - Admin JWT token to verify
 * @returns The verification result or undefined if invalid
 */
export const verifyAdminToken = (
  token: string
): TokenVerificationResult<AdminAccessPayload> | undefined => {
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminAccessPayload

    // Additional validation to ensure it's an admin token
    if (!payload.isAdmin) {
      return undefined
    }

    return {
      expired: false,
      payload
    }
  } catch (error) {
    // Check if the error is specifically a token expiration error
    if (error instanceof jwt.TokenExpiredError) {
      try {
        // Decode without verification to get the payload
        const payload = jwt.decode(token) as AdminAccessPayload
        
        // Ensure it's an admin token
        if (!payload.isAdmin) {
          return undefined
        }
        
        return {
          expired: true,
          payload
        }
      } catch (decodeError) {
        // If even decoding fails, token is malformed
        return undefined
      }
    }
    return undefined
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns The JWT token or undefined if not found
 */
export const extractTokenFromHeader = (
  authHeader?: string
): string | undefined => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined
  }

  return authHeader.substring(7) // Remove 'Bearer ' prefix
}
