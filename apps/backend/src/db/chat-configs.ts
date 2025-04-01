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
 * Get a chat config by domain
 * @param domain The domain to lookup (e.g. "example.com")
 * @returns The chat config or null if not found
 */
export const getChatConfigByDomain = async (domain: string) => {
  // Use serviceSupabase to bypass RLS if available, otherwise fall back to regular client
  const client = serviceSupabase || supabase

  const { data: chatConfig, error } = await client
    .from('chat_configs')
    .select('*')
    .eq('domain', domain)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get chat config: ${error.message}`)
  }

  return chatConfig
}

/**
 * Get all chat configs
 * @returns Array of chat configs
 */
export const getAllChatConfigs = async () => {
  const client = serviceSupabase || supabase

  const { data: chatConfigs, error } = await client
    .from('chat_configs')
    .select('*')
    .order('domain', { ascending: true })

  if (error) {
    throw new Error(`Failed to get chat configs: ${error.message}`)
  }

  return chatConfigs || []
}

/**
 * Create a new chat config
 * @param chatConfig The chat config to create
 * @returns The created chat config
 */
export const createChatConfig = async (
  chatConfig: TablesInsert<'chat_configs'>
) => {
  const client = serviceSupabase || supabase

  const { data: createdChatConfig, error } = await client
    .from('chat_configs')
    .insert([chatConfig])
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create chat config: ${error.message}`)
  }

  return createdChatConfig
}

/**
 * Update a chat config
 * @param domain The domain of the config to update
 * @param updates The fields to update
 * @returns The updated chat config
 */
export const updateChatConfig = async (
  domain: string,
  updates: TablesUpdate<'chat_configs'>
) => {
  const client = serviceSupabase || supabase

  const { data: updatedChatConfig, error } = await client
    .from('chat_configs')
    .update(updates)
    .eq('domain', domain)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update chat config: ${error.message}`)
  }

  return updatedChatConfig
}

/**
 * Delete a chat config
 * @param domain The domain of the config to delete
 * @returns true if successful
 */
export const deleteChatConfig = async (domain: string) => {
  const client = serviceSupabase || supabase

  const { error } = await client
    .from('chat_configs')
    .delete()
    .eq('domain', domain)

  if (error) {
    throw new Error(`Failed to delete chat config: ${error.message}`)
  }

  return true
}

/**
 * Get a chat config by domain, falling back to the default if not found
 * @param domain The domain to lookup
 * @returns The chat config for the domain or the default config
 */
export const getChatConfigWithFallback = async (domain: string) => {
  try {
    const chatConfig = await getChatConfigByDomain(domain)

    if (chatConfig) {
      return chatConfig
    }

    // If not found, return the default config
    return await getChatConfigByDomain('default')
  } catch (error) {
    console.error(`Error getting chat config for domain ${domain}:`, error)
    // If anything fails, try to get the default config
    return await getChatConfigByDomain('default').catch(() => undefined)
  }
}
