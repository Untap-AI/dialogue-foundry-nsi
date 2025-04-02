import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import chatRoutes from './routes/chat-routes'
import chatConfigRoutes from './routes/chat-config-routes'
import cacheRoutes from './routes/cache-routes'
import adminRoutes from './routes/admin-routes'

// Load environment variables
dotenv.config()

// Create Express application
const app = express()
const port = process.env.PORT || 3000

// Parse JSON bodies
app.use(express.json())

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000'
]
app.use(
  cors({
    origin: (thisOrigin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      // eslint-disable-next-line no-null/no-null
      if (!thisOrigin) return callback(null, true)

      if (allowedOrigins.indexOf(thisOrigin) === -1) {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${thisOrigin}`
        return callback(new Error(msg), false)
      }
      // eslint-disable-next-line no-null/no-null
      return callback(null, true)
    },
    credentials: true
  })
)

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/chats', chatRoutes)
app.use('/api/chat-configs', chatConfigRoutes)
app.use('/api/cache', cacheRoutes)
app.use('/api/admin', adminRoutes)

// Error handling middleware
app.use((err: Error, _: express.Request, res: express.Response) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

// Start the server
app.listen(port, () => {
  console.info(`Server is running on port ${port}`)
  console.info(`Health check: http://localhost:${port}/health`)
})

export default app
