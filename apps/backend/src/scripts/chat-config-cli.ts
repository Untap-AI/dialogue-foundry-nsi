#!/usr/bin/env node
/* eslint-disable no-console */
import dotenv from 'dotenv'
import {
  getAllChatConfigs,
  getChatConfigByDomain,
  createChatConfig,
  updateChatConfig,
  deleteChatConfig
} from '../db/chat-configs'

// Load environment variables
dotenv.config()

const usage = `
Chat Config CLI - Manage chat configurations from the command line

Usage:
  npx ts-node src/scripts/chat-config-cli.ts <command> [options]

Commands:
  list                      - List all chat configurations
  get <domain>              - Get configuration for a specific domain
  create <domain> <prompt> [pinecone-index] 
                           - Create a new configuration
  update <domain> <prompt> [pinecone-index]
                           - Update an existing configuration
  delete <domain>          - Delete a configuration

Examples:
  npx ts-node src/scripts/chat-config-cli.ts list
  npx ts-node src/scripts/chat-config-cli.ts get example.com
  npx ts-node src/scripts/chat-config-cli.ts create example.com "You are a helpful assistant." my-pinecone-index
  npx ts-node src/scripts/chat-config-cli.ts update example.com "New system prompt"
  npx ts-node src/scripts/chat-config-cli.ts delete example.com
`

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (!command || command === 'help' || command === '--help') {
    console.log(usage)
    process.exit(0)
  }

  try {
    switch (command) {
      case 'list':
        await listConfigs()
        break
      case 'get':
        if (!args[1]) {
          console.error('Error: Domain is required for the get command')
          console.log(usage)
          process.exit(1)
        }
        await getConfig(args[1])
        break
      case 'create':
        if (!args[1] || !args[2]) {
          console.error(
            'Error: Domain and system prompt are required for the create command'
          )
          console.log(usage)
          process.exit(1)
        }
        await createConfig(args[1], args[2], args[3])
        break
      case 'update':
        if (!args[1] || !args[2]) {
          console.error(
            'Error: Domain and system prompt are required for the update command'
          )
          console.log(usage)
          process.exit(1)
        }
        await updateConfig(args[1], args[2], args[3])
        break
      case 'delete':
        if (!args[1]) {
          console.error('Error: Domain is required for the delete command')
          console.log(usage)
          process.exit(1)
        }
        await deleteConfig(args[1])
        break
      default:
        console.error(`Error: Unknown command "${command}"`)
        console.log(usage)
        process.exit(1)
    }
  } catch (error) {
    console.error(
      'Error:',
      error instanceof Error ? error.message : String(error)
    )
    process.exit(1)
  }
}

async function listConfigs() {
  const configs = await getAllChatConfigs()
  console.log('Chat Configurations:')

  if (configs.length === 0) {
    console.log('  No configurations found.')
  } else {
    configs.forEach(config => {
      console.log(`\n  Domain: ${config.domain}`)
      console.log(`  System Prompt: ${config.system_prompt}`)
      console.log(
        `  Pinecone Index: ${config.pinecone_index_name || 'Not set'}`
      )
      console.log(`  Created: ${new Date(config.created_at).toISOString()}`)
    })
  }
}

async function getConfig(domain: string) {
  const config = await getChatConfigByDomain(domain)

  if (!config) {
    console.log(`No configuration found for domain "${domain}".`)
    return
  }

  console.log(`Domain: ${config.domain}`)
  console.log(`System Prompt: ${config.system_prompt}`)
  console.log(`Pinecone Index: ${config.pinecone_index_name || 'Not set'}`)
  console.log(`Created: ${new Date(config.created_at).toISOString()}`)
}

async function createConfig(
  domain: string,
  systemPrompt: string,
  pineconeIndex?: string
) {
  // Check if domain already exists
  const existing = await getChatConfigByDomain(domain)
  if (existing) {
    console.error(`A configuration for domain "${domain}" already exists.`)
    process.exit(1)
  }

  await createChatConfig({
    domain,
    system_prompt: systemPrompt,
    pinecone_index_name: pineconeIndex || undefined
  })

  console.log(`Configuration for domain "${domain}" created successfully.`)
}

async function updateConfig(
  domain: string,
  systemPrompt: string,
  pineconeIndex?: string
) {
  // Check if domain exists
  const existing = await getChatConfigByDomain(domain)
  if (!existing) {
    console.error(`No configuration found for domain "${domain}".`)
    process.exit(1)
  }

  const updates: { system_prompt: string; pinecone_index_name?: string } = {
    system_prompt: systemPrompt
  }

  if (pineconeIndex !== undefined) {
    updates.pinecone_index_name = pineconeIndex || undefined
  }

  await updateChatConfig(domain, updates)
  console.log(`Configuration for domain "${domain}" updated successfully.`)
}

async function deleteConfig(domain: string) {
  if (domain === 'default') {
    console.error('Cannot delete the default configuration.')
    process.exit(1)
  }

  // Check if domain exists
  const existing = await getChatConfigByDomain(domain)
  if (!existing) {
    console.error(`No configuration found for domain "${domain}".`)
    process.exit(1)
  }

  await deleteChatConfig(domain)
  console.log(`Configuration for domain "${domain}" deleted successfully.`)
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
