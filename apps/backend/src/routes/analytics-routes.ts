import express from 'express'
import { z } from 'zod'
import { 
  createAnalyticsEventAdmin, 
  type EventType,
} from '../db/analytics'

const router = express.Router()

// Validation schemas for different event types
const linkClickEventSchema = z.object({
  url: z.string().url(),
  link_text: z.string().optional(),
  click_position: z.number().optional()
})

const conversationStarterClickEventSchema = z.object({
  label: z.string(),
  position: z.number(),
  prompt: z.string().optional()
})

// Base analytics event schema
const analyticsEventSchema = z.object({
  chat_id: z.string().uuid(),
  message_id: z.string().optional(),
  user_id: z.string().uuid(),
  company_id: z.string(),
  event_type: z.enum([
    'link_click',
    'conversation_starter_click',
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
    case 'conversation_starter_click':
      return conversationStarterClickEventSchema.parse(eventData)
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

    return res.status(201).json({
      success: true,
      data: analyticsEvent
    })
  } catch (error) {
    console.error('Error creating analytics event:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create analytics event'
    })
  }
})

/**
 * POST /
 * Create a new analytics event (base route)
 */
router.post('/', async (req, res) => {
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

    return res.status(201).json({
      success: true,
      data: analyticsEvent
    })
  } catch (error) {
    console.error('Error creating analytics event:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.message
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create analytics event'
    })
  }
})

export default router 