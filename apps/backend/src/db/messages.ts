import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { supabase } from '../lib/supabase-client'
import { createFetchWithRetry } from '../lib/fetch-with-retry'
import type { Database, TablesInsert, TablesUpdate } from '../types/database'

dotenv.config()

// Maximum number of messages to keep per chat
export const MAX_MESSAGES_PER_CHAT = 50

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

export const getMessagesByChatId = async (chatId: string) => {
  // Use serviceSupabase to bypass RLS if available, otherwise fall back to regular client
  const client = serviceSupabase || supabase

  const { data: messages, error } = await client
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('sequence_number', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return messages || []
}

/**
 * Deletes oldest messages in a chat if the total exceeds MAX_MESSAGES_PER_CHAT
 * Ensures we don't keep growing the database indefinitely for active chats
 */
export const cleanupOldMessages = async (chatId: string) => {
  if (!serviceSupabase) {
    throw new Error(
      'Service role client not initialized. Check your environment variables.'
    )
  }

  // Get the current count of messages for this chat
  const { count, error: countError } = await serviceSupabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', chatId)

  if (countError) {
    throw new Error(`Failed to count messages: ${countError.message}`)
  }

  if (!count || count <= MAX_MESSAGES_PER_CHAT) {
    return // No cleanup needed
  }

  // Calculate how many messages to delete
  const deleteCount = count - MAX_MESSAGES_PER_CHAT

  // Get the IDs of the oldest messages to delete
  const { data: messagesToDelete, error: fetchError } = await serviceSupabase
    .from('messages')
    .select('id')
    .eq('chat_id', chatId)
    .order('sequence_number', { ascending: true })
    .limit(deleteCount)

  if (fetchError) {
    throw new Error(`Failed to fetch old messages: ${fetchError.message}`)
  }

  if (!messagesToDelete || messagesToDelete.length === 0) {
    return
  }

  // Extract the IDs to delete
  const idsToDelete = messagesToDelete.map(msg => msg.id)

  // Delete the oldest messages
  const { error: deleteError } = await serviceSupabase
    .from('messages')
    .delete()
    .in('id', idsToDelete)

  if (deleteError) {
    throw new Error(`Failed to delete old messages: ${deleteError.message}`)
  }

  console.log(`Deleted ${idsToDelete.length} old messages from chat ${chatId}`)
}

/**
 * Create a message with admin privileges (bypasses RLS)
 * Use this when creating messages on behalf of users
 */
export const createMessageAdmin = async (
  message: Omit<TablesInsert<'messages'>, 'id'>
) => {
  if (!serviceSupabase) {
    throw new Error(
      'Service role client not initialized. Check your environment variables.'
    )
  }

  const messageWithDefaults = {
    id: uuidv4(),
    ...message,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Clean up old messages before creating a new one
  await cleanupOldMessages(message.chat_id)

  const { data: createdMessage, error } = await serviceSupabase
    .from('messages')
    .insert([messageWithDefaults])
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`)
  }

  return createdMessage
}

export const getLatestSequenceNumber = async (chatId: string) => {
  const client = serviceSupabase || supabase

  const { data, error } = await client
    .from('messages')
    .select('sequence_number')
    .eq('chat_id', chatId)
    .order('sequence_number', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(error.message)
  }

  // If no messages exist yet, return 0
  return data && data.length > 0 ? data[0]?.sequence_number || 0 : 0
}
