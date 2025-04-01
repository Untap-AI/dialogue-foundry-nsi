#!/usr/bin/env ts-node

/**
 * Simple script to create a chat configuration for a company
 * This is useful for developers who need to create a chat configuration quickly
 * 
 * Usage:
 * npx ts-node scripts/create-company-config.ts <company_id> <pinecone_index_name> <system_prompt>
 * 
 * Example:
 * npx ts-node scripts/create-company-config.ts my-company my-company-index "You are an AI assistant for My Company."
 * 
 * If system prompt contains spaces, enclose in quotes.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import readline from 'readline'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
  process.exit(1)
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createChatConfig(companyId: string, pineconeIndexName: string, systemPrompt: string): Promise<void> {
  try {
    // Check if the configuration already exists
    const { data: existingConfig } = await supabase
      .from('chat_configs')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle()

    if (existingConfig) {
      console.log(`Configuration for company ID "${companyId}" already exists.`)
      console.log(`Would you like to update it? (y/n)`)
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      rl.question('', async (answer: string) => {
        if (answer.toLowerCase() === 'y') {
          // Update the existing configuration
          const { error } = await supabase
            .from('chat_configs')
            .update({
              pinecone_index_name: pineconeIndexName,
              system_prompt: systemPrompt,
              updated_at: new Date().toISOString()
            })
            .eq('company_id', companyId)

          if (error) {
            console.error(`Error updating configuration: ${error.message}`)
            process.exit(1)
          }

          console.log(`Configuration for company ID "${companyId}" has been updated.`)
        } else {
          console.log('Update canceled.')
        }
        
        rl.close()
        process.exit(0)
      })
      
      return // Wait for readline input
    }

    // Create a new configuration
    const { data, error } = await supabase
      .from('chat_configs')
      .insert([
        {
          company_id: companyId,
          pinecone_index_name: pineconeIndexName,
          system_prompt: systemPrompt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('*')
      .single()

    if (error) {
      console.error(`Error creating configuration: ${error.message}`)
      process.exit(1)
    }

    console.log(`Configuration for company ID "${companyId}" has been created:`)
    console.log(JSON.stringify(data, null, 2))
    process.exit(0)
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

function printUsage(): void {
  console.log(`
  Usage:
    npx ts-node scripts/create-company-config.ts <company_id> <pinecone_index_name> <system_prompt>
  
  Example:
    npx ts-node scripts/create-company-config.ts my-company my-company-index "You are an AI assistant for My Company."
  
  If system prompt contains spaces, enclose in quotes.
  `)
}

// Main
if (process.argv.length < 5) {
  console.error("Error: Missing required arguments.")
  printUsage()
  process.exit(1)
}

const companyId = process.argv[2]
const pineconeIndexName = process.argv[3]
const systemPrompt = process.argv[4]

createChatConfig(companyId, pineconeIndexName, systemPrompt) 