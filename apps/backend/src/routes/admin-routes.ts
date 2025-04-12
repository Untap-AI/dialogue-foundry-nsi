import express from 'express'
import dotenv from 'dotenv'
import { authenticateAdmin } from '../middleware/auth-middleware'
import { generateAdminAccessToken } from '../lib/jwt-utils'
import { logger } from '../lib/logger'
import type { CustomRequest } from '../middleware/auth-middleware'

dotenv.config()

const router = express.Router()

/**
 * POST /api/admin/token
 * Generate an admin token by providing the admin password
 * This endpoint requires the admin password to be passed in the x-admin-key header
 */
router.post('/token', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    const { userId = req.user?.userId || 'admin-user' } = req.body

    // Generate admin token
    const token = generateAdminAccessToken(userId)

    return res.json({
      token,
      expiresIn: process.env.ADMIN_JWT_EXPIRY || '43200', // 12 hours in seconds
      tokenType: 'Bearer',
      userId,
      isAdmin: true,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error generating admin token', {
      error: error as Error,
      userId: req.body.userId || req.user?.userId || 'admin-user'
    })
    return res.status(500).json({ error: 'Failed to generate admin token' })
  }
})

/**
 * GET /api/admin/verify
 * Verify that the current user has admin privileges
 * This is useful for frontend applications to check admin status
 */
router.get('/verify', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    return res.json({
      isAdmin: true,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error in admin verification', {
      error: error as Error,
      requestedBy: req.user?.userId
    })
    return res.status(500).json({ error: 'Admin verification failed' })
  }
})

export default router
