import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

// Get JWT secret from environment variables or use a default for development
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'super-secret-jwt-token-with-at-least-32-characters-long'
const TOKEN_EXPIRY = process.env.JWT_EXPIRY
  ? parseInt(process.env.JWT_EXPIRY)
  : 86400 // 24 hours in seconds

// Admin-specific JWT settings
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  `${JWT_SECRET}-admin-extension-key-do-not-use-in-production`
const ADMIN_TOKEN_EXPIRY = process.env.ADMIN_JWT_EXPIRY
  ? parseInt(process.env.ADMIN_JWT_EXPIRY)
  : 43200 // 12 hours in seconds

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
 * @returns The decoded payload or undefined if invalid
 */
export const verifyToken = (token: string): ChatAccessPayload | undefined => {
  try {
    return jwt.verify(token, JWT_SECRET) as ChatAccessPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return undefined
  }
}

/**
 * Verify and decode an admin JWT token
 * @param token - Admin JWT token to verify
 * @returns The decoded admin payload or undefined if invalid
 */
export const verifyAdminToken = (
  token: string
): AdminAccessPayload | undefined => {
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminAccessPayload

    // Additional validation to ensure it's an admin token
    if (!payload.isAdmin) {
      console.error('Token is not an admin token')
      return undefined
    }

    return payload
  } catch (error) {
    console.error('Admin JWT verification failed:', error)
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
