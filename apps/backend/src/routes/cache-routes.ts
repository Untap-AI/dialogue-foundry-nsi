import express from 'express'
import { authenticateAdmin } from '../middleware/auth-middleware'
import { cacheService } from '../services/cache-service'
import type { CustomRequest } from '../middleware/auth-middleware'

const router = express.Router()

/**
 * GET /api/cache/stats
 * Get statistics for all caches in the system
 * This is useful for debugging and monitoring cache efficiency
 * Requires admin authentication
 */
router.get('/stats', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    const stats = cacheService.stats()
    return res.json({
      stats,
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.userId
    })
  } catch (error) {
    console.error('Error retrieving cache statistics:', error)
    return res
      .status(500)
      .json({ error: 'Failed to retrieve cache statistics' })
  }
})

/**
 * POST /api/cache/flush
 * Flush all caches in the system
 * This can be used when cache data becomes stale or during deployments
 * Requires admin authentication
 */
router.post('/flush', authenticateAdmin, async (req: CustomRequest, res) => {
  try {
    cacheService.flushAll()
    return res.json({
      success: true,
      message: 'All caches flushed successfully',
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.userId
    })
  } catch (error) {
    console.error('Error flushing caches:', error)
    return res.status(500).json({ error: 'Failed to flush caches' })
  }
})

/**
 * POST /api/cache/flush/:cacheName
 * Flush a specific cache in the system
 * Valid cache names: chatConfig, chat, pineconeIndex
 * Requires admin authentication
 */
router.post(
  '/flush/:cacheName',
  authenticateAdmin,
  async (req: CustomRequest, res) => {
    try {
      const { cacheName } = req.params

      // Validate the cache name
      if (!['chatConfig', 'chat', 'pineconeIndex'].includes(cacheName)) {
        return res.status(400).json({
          error: 'Invalid cache name',
          validCacheNames: ['chatConfig', 'chat', 'pineconeIndex']
        })
      }

      cacheService.flushCache(
        cacheName as 'chatConfig' | 'chat' | 'pineconeIndex'
      )

      return res.json({
        success: true,
        message: `Cache '${cacheName}' flushed successfully`,
        timestamp: new Date().toISOString(),
        requestedBy: req.user?.userId
      })
    } catch (error) {
      console.error('Error flushing specific cache:', error)
      return res.status(500).json({ error: 'Failed to flush cache' })
    }
  }
)

export default router
