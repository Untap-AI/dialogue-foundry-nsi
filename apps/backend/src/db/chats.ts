import { v4 as uuidv4 } from 'uuid'
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

export const getChatById = async (chatId: string) => {
  // Use serviceSupabase to bypass RLS if available, otherwise fall back to regular client
  const client = serviceSupabase || supabase

  const { data: chat, error } = await client
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return chat
}

export const getChatsByUserId = async (userId: string) => {
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return chats
}

export const createChat = async (chat: TablesInsert<'chats'>) => {
  const { data: createdChat, error } = await supabase
    .from('chats')
    .insert([chat])
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdChat
}

/**
 * Create a chat with admin privileges (bypasses RLS)
 * Use this when creating chats on behalf of users
 */
export const createChatAdmin = async (
  chat: Omit<TablesInsert<'chats'>, 'id'>
) => {
  if (!serviceSupabase) {
    throw new Error(
      'Service role client not initialized. Check your environment variables.'
    )
  }

  const chatWithDefaults = {
    id: uuidv4(),
    ...chat,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: createdChat, error } = await serviceSupabase
    .from('chats')
    .insert([chatWithDefaults])
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to create chat: ${error.message}`)
  }

  return createdChat
}

/**
 * Update a chat with the user's email (admin function to bypass RLS)
 * @param chatId The chat ID to update
 * @param userEmail The user's email address
 * @returns The updated chat record
 */
export const updateChatUserEmailAdmin = async (chatId: string, userEmail: string) => {
  if (!serviceSupabase) {
    throw new Error(
      'Service role client not initialized. Check your environment variables.'
    )
  }

  const { data: updatedChat, error } = await serviceSupabase
    .from('chats')
    .update({ 
      user_email: userEmail,
      updated_at: new Date().toISOString()
    })
    .eq('id', chatId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update chat user email: ${error.message}`)
  }

  return updatedChat
}
