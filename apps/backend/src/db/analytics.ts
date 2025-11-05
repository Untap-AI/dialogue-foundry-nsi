import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createFetchWithRetry } from '../lib/fetch-with-retry'
import type { Database } from '../types/database'
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
        },
        global: {
          fetch: createFetchWithRetry({
            maxRetries: 3,
            initialDelayMs: 500,
            maxDelayMs: 5000,
            timeoutMs: 15000
          })
        }
      })
    : undefined

// Event type definitions for type safety
export type EventType = 
  | 'link_click'
  | 'conversation_starter_click'

// Event data interfaces for different event types
export interface LinkClickEventData {
  url: string
  link_text?: string
  click_position?: number
}

export interface ConversationStarterClickEventData {
  label: string
  position: number
  prompt?: string
}

// Union type for all event data
export type EventData = 
  | LinkClickEventData
  | ConversationStarterClickEventData


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