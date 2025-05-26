import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { supabase } from '../lib/supabase-client'
import type { Database, TablesInsert } from '../types/database'
import type { Json } from '../types/database'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a Supabase client with the service role key to bypass RLS for admin operations
const serviceSupabase =
  supabaseUrl && supabaseServiceKey
    ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : undefined

// Event type definitions for type safety
export type EventType = 
  | 'link_click'

// Event data interfaces for different event types
export interface LinkClickEventData {
  url: string
  link_text?: string
  click_position?: number
}

// Union type for all event data
export type EventData = 
  | LinkClickEventData


export interface AnalyticsEventData {
  chat_id: string
  message_id?: string
  user_id: string
  company_id?: string
  event_type: EventType
  event_data: EventData
  message_role?: 'user' | 'assistant'
  session_id?: string
  user_agent?: string
  referrer?: string
  ip_address?: string
}

/**
 * Create an analytics event with admin privileges (bypasses RLS)
 * Use this when recording events on behalf of users
 */
export const createAnalyticsEventAdmin = async (analyticsEvent: AnalyticsEventData) => {
  if (!serviceSupabase) {
    throw new Error(
      'Service role client not initialized. Check your environment variables.'
    )
  }

  const eventWithDefaults = {
    id: uuidv4(),
    ...analyticsEvent,
    event_data: analyticsEvent.event_data as unknown as Json,
    created_at: new Date().toISOString()
  }

  const { data: createdEvent, error } = await serviceSupabase
    .from('analytics_events')
    .insert([eventWithDefaults])
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create analytics event: ${error.message}`)
  }

  return createdEvent
}

/**
 * Get analytics events for a specific chat
 */
export const getAnalyticsEventsByChatId = async (
  chatId: string, 
  eventType?: EventType,
  limit?: number
) => {
  let query = supabase
    .from('analytics_events')
    .select('*')
    .eq('chat_id', chatId)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data: events, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get analytics events: ${error.message}`)
  }

  return events || []
}

/**
 * Get analytics events for a specific company
 */
export const getAnalyticsEventsByCompanyId = async (
  companyId: string,
  eventType?: EventType,
  limit?: number,
  startDate?: Date,
  endDate?: Date
) => {
  let query = supabase
    .from('analytics_events')
    .select('*')
    .eq('company_id', companyId)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  if (limit) {
    query = query.limit(limit)
  }

  const { data: events, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get company analytics events: ${error.message}`)
  }

  return events || []
}

/**
 * Get analytics summary for a company
 */
export const getAnalyticsSummary = async (
  companyId: string, 
  days: number = 30
) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: events, error } = await supabase
    .from('analytics_events')
    .select('event_type, event_data, created_at, message_role')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get analytics summary: ${error.message}`)
  }

  // Process events into summary statistics
  const summary = {
    total_events: events?.length || 0,
    events_by_type: {} as Record<string, number>,
    events_by_day: {} as Record<string, number>,
    link_clicks: {
      total: 0,
      unique_urls: new Set<string>(),
      top_urls: {} as Record<string, { count: number; last_clicked: string }>
    },
    message_reactions: {
      total: 0,
      by_type: {} as Record<string, number>
    },
    errors: {
      total: 0,
      by_type: {} as Record<string, number>
    }
  }

  events?.forEach(event => {
    // Count by event type
    summary.events_by_type[event.event_type] = (summary.events_by_type[event.event_type] || 0) + 1

    // Count by day
    const day = event.created_at.split('T')[0]
    summary.events_by_day[day] = (summary.events_by_day[day] || 0) + 1

    // Process specific event types
    switch (event.event_type) {
      case 'link_click':
        summary.link_clicks.total++
        const linkData = event.event_data as unknown as LinkClickEventData
        if (linkData.url) {
          summary.link_clicks.unique_urls.add(linkData.url)
          if (!summary.link_clicks.top_urls[linkData.url]) {
            summary.link_clicks.top_urls[linkData.url] = { count: 0, last_clicked: event.created_at }
          }
          summary.link_clicks.top_urls[linkData.url].count++
          summary.link_clicks.top_urls[linkData.url].last_clicked = event.created_at
        }
        break
    }
  })

  // Convert unique URLs set to count
  const linkClicksSummary = {
    ...summary.link_clicks,
    unique_urls: summary.link_clicks.unique_urls.size,
    top_urls: Object.entries(summary.link_clicks.top_urls)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([url, data]) => ({ url, ...data }))
  }

  return {
    ...summary,
    link_clicks: linkClicksSummary
  }
}

/**
 * Get user journey analytics for a specific user session
 */
export const getUserJourney = async (
  sessionId: string,
  chatId?: string
) => {
  let query = supabase
    .from('analytics_events')
    .select('*')
    .eq('session_id', sessionId)

  if (chatId) {
    query = query.eq('chat_id', chatId)
  }

  const { data: events, error } = await query.order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get user journey: ${error.message}`)
  }

  return events || []
} 