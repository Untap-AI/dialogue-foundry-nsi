import express from 'express'
import { z } from 'zod'
import { 
  createAnalyticsEventAdmin, 
  getAnalyticsEventsByChatId, 
  getAnalyticsEventsByCompanyId,
  getAnalyticsSummary,
  getUserJourney,
  type EventType,
} from '../db/analytics'

const router = express.Router()

// Validation schemas for different event types
const linkClickEventSchema = z.object({
  url: z.string().url(),
  link_text: z.string().optional(),
  click_position: z.number().optional()
})

// Base analytics event schema
const analyticsEventSchema = z.object({
  chat_id: z.string().uuid(),
  message_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  event_type: z.enum([
    'link_click',
  ]),
  event_data: z.any(), // Will be validated based on event_type
  message_role: z.enum(['user', 'assistant']).optional(),
  session_id: z.string().optional(),
  user_agent: z.string().optional(),
  referrer: z.string().optional(),
  ip_address: z.string().optional()
})

// Helper function to validate event data based on event type
const validateEventData = (eventType: EventType, eventData: any) => {
  switch (eventType) {
    case 'link_click':
      return linkClickEventSchema.parse(eventData)
    default:
      throw new Error(`Unknown event type: ${eventType}`)
  }
}

/**
 * POST /analytics/events
 * Create a new analytics event
 */
router.post('/events', async (req, res) => {
  try {
    // Parse and validate the base event structure
    const eventData = analyticsEventSchema.parse(req.body)
    
    // Validate the event_data based on event_type
    const validatedEventData = validateEventData(eventData.event_type, eventData.event_data)
    
    // Extract IP address from request if not provided
    const ipAddress = eventData.ip_address || 
      req.ip || 
      req.connection.remoteAddress || 
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress

    // Create the analytics event
    const analyticsEvent = await createAnalyticsEventAdmin({
      ...eventData,
      event_data: validatedEventData,
      ip_address: ipAddress
    })

    res.status(201).json({
      success: true,
      data: analyticsEvent
    })
  } catch (error) {
    console.error('Error creating analytics event:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create analytics event'
    })
  }
})

/**
 * GET /analytics/events/chat/:chatId
 * Get analytics events for a specific chat
 */
router.get('/events/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params
    const { event_type, limit } = req.query

    const events = await getAnalyticsEventsByChatId(
      chatId,
      event_type as EventType,
      limit ? parseInt(limit as string) : undefined
    )

    res.json({
      success: true,
      data: events
    })
  } catch (error) {
    console.error('Error getting chat analytics events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics events'
    })
  }
})

/**
 * GET /analytics/events/company/:companyId
 * Get analytics events for a specific company
 */
router.get('/events/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const { event_type, limit, start_date, end_date } = req.query

    const startDate = start_date ? new Date(start_date as string) : undefined
    const endDate = end_date ? new Date(end_date as string) : undefined

    const events = await getAnalyticsEventsByCompanyId(
      companyId,
      event_type as EventType,
      limit ? parseInt(limit as string) : undefined,
      startDate,
      endDate
    )

    res.json({
      success: true,
      data: events
    })
  } catch (error) {
    console.error('Error getting company analytics events:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics events'
    })
  }
})

/**
 * GET /analytics/summary/:companyId
 * Get analytics summary for a company
 */
router.get('/summary/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const { days } = req.query

    const summary = await getAnalyticsSummary(
      companyId,
      days ? parseInt(days as string) : 30
    )

    res.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Error getting analytics summary:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics summary'
    })
  }
})

/**
 * GET /analytics/journey/:sessionId
 * Get user journey analytics for a session
 */
router.get('/journey/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { chat_id } = req.query

    const journey = await getUserJourney(
      sessionId,
      chat_id as string
    )

    res.json({
      success: true,
      data: journey
    })
  } catch (error) {
    console.error('Error getting user journey:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get user journey'
    })
  }
})

export default router 