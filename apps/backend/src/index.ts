import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import chatRoutes, { applyStreamRateLimit } from './routes/chat-routes'
import chatConfigRoutes from './routes/chat-config-routes'
import cacheRoutes from './routes/cache-routes'
import adminRoutes from './routes/admin-routes'
import { logger } from './lib/logger'

// Load environment variables
dotenv.config()

// Create Express application
const app = express()
const port = parseInt(process.env.PORT || '3000', 10)

// Parse JSON bodies
app.use(express.json())

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000'
]
app.use(
  cors({
    origin: (thisOrigin, callback) => {
      console.log('thisOrigin', thisOrigin)
      // Allow requests with no origin (like mobile apps or curl requests)
      // eslint-disable-next-line no-null/no-null
      if (!thisOrigin) return callback(null, true)

      console.log('allowedOrigins', allowedOrigins)

      if (allowedOrigins.indexOf(thisOrigin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${thisOrigin}`
        return callback(new Error(msg), false)
      }

      console.log('callback')
      // eslint-disable-next-line no-null/no-null
      return callback(null, true)
    },
    credentials: true
  })
)

// Configure rate limiting
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per window per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  // Trust the X-Forwarded-For header from Render's proxy
  skipSuccessfulRequests: false // Don't skip successful requests
})

// Apply global rate limit to all requests
app.use(globalRateLimit)

// More strict rate limit for chat streaming endpoint
const chatStreamRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20, // 20 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many chat requests, please try again later.' },
  skipSuccessfulRequests: false,
  keyGenerator: req => {
    // Use user ID from authentication if available, otherwise IP
    return (req as any).user?.userId || req.ip
  }
})

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/chats', chatRoutes)
app.use('/api/chat-configs', chatConfigRoutes)
app.use('/api/cache', cacheRoutes)
app.use('/api/admin', adminRoutes)

// Apply the chat stream rate limiter to the streaming routes
applyStreamRateLimit(chatStreamRateLimit)

// 404 handler - must come after routes
app.use(
  (
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.url} not found`
    })
  }
)

// Primary error handling middleware
// Explicitly defining types without using underscores
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    // Log the error with our Sentry logger
    logger.error(err, {
      stack: err.stack,
      message: err.message,
      name: err.name
    })

    // Safety check to ensure res is valid and has status method
    if (!res || typeof res.status !== 'function') {
      logger.error('Invalid response object in error handler', { res })
      return next(err) // Try to pass to default Express error handler
    }

    // Handle CORS errors differently
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({
        error: 'CORS Error',
        message:
          process.env.DEPLOYMENT_ENV === 'development' ||
          process.env.DEPLOYMENT_ENV === 'smokebox'
            ? err.message
            : 'Origin not allowed'
      })
    }

    // Generic error response
    return res.status(500).json({
      error: 'An unexpected error occurred',
      message:
        process.env.DEPLOYMENT_ENV === 'development' ||
        process.env.DEPLOYMENT_ENV === 'smokebox'
          ? err.message
          : undefined
    })
  }
)

// Start the server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`)
  logger.info(`Health check: http://localhost:${port}/health`)
})

export default app
