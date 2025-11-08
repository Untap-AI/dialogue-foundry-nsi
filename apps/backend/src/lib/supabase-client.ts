import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import type { Database } from '../types/database'
import { env } from 'process'
import { createFetchWithRetry } from './fetch-with-retry'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase environment variables for ${env} environment`
  )
}

console.info(`Connecting to Supabase at ${supabaseUrl} (${env} environment)`)

// Create Supabase client with retry-enabled fetch
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createFetchWithRetry({
      maxRetries: 3,
      initialDelayMs: 500,
      maxDelayMs: 5000,
      timeoutMs: 15000 // 15 second timeout for Supabase queries
    })
  }
})
