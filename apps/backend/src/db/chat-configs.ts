import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { supabase } from '../lib/supabase-client'
import type { Database, TablesInsert, TablesUpdate } from '../types/database'

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

/**
 * Get a chat config by company ID
 * @param companyId The company ID to lookup
 * @returns The chat config or null if not found
 */
export const getChatConfigByCompanyId = async (companyId: string) => {
  // Use serviceSupabase to bypass RLS if available, otherwise fall back to regular client
  const client = serviceSupabase || supabase

  const { data: chatConfig, error } = await client
    .from('chat_configs')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    console.error('Error getting chat config:', error)
    throw new Error(`Failed to get chat config: ${error.message}`)
  }

  return chatConfig
}
