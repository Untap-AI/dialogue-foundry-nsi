#!/usr/bin/env node
/* eslint-disable no-console */
import dotenv from 'dotenv'
import {
  getAllChatConfigs,
  getChatConfigByCompanyId,
  createChatConfig,
  updateChatConfig,
  deleteChatConfig
} from '../db/chat-configs'

// Load environment variables
dotenv.config()

// Simple CLI argument parsing
const args = process.argv.slice(2)
const command = args[0]

async function listConfigs() {
  try {
    const configs = await getAllChatConfigs()
    console.log('\n===== All Chat Configurations =====')

    if (configs.length === 0) {
      console.log('No configurations found.')
    } else {
      configs.forEach(config => {
        console.log(`\n--- ${config.company_id} ---`)
        console.log(`Company ID: ${config.company_id}`)
        console.log(`System Prompt: ${config.system_prompt}`)
        console.log(
          `Pinecone Index: ${config.pinecone_index_name || 'Not set'}`
        )
        console.log(`Created: ${new Date(config.created_at).toLocaleString()}`)
        if (config.updated_at) {
          console.log(
            `Last Updated: ${new Date(config.updated_at).toLocaleString()}`
          )
        }
      })
    }
  } catch (error) {
    console.error('Error listing configurations:', error)
    process.exit(1)
  }
}

async function getConfig(companyId: string) {
  try {
    if (!companyId) {
      console.error('Company ID is required')
      process.exit(1)
    }

    const config = await getChatConfigByCompanyId(companyId)

    if (!config) {
      console.log(`No configuration found for company ID "${companyId}".`)
      process.exit(1)
    }

    console.log(`\n===== Configuration for ${companyId} =====`)
    console.log(`Company ID: ${config.company_id}`)
    console.log(`System Prompt: ${config.system_prompt}`)
    console.log(`Pinecone Index: ${config.pinecone_index_name || 'Not set'}`)
    console.log(`Created: ${new Date(config.created_at).toLocaleString()}`)
    if (config.updated_at) {
      console.log(
        `Last Updated: ${new Date(config.updated_at).toLocaleString()}`
      )
    }
  } catch (error) {
    console.error('Error getting configuration:', error)
    process.exit(1)
  }
}

async function createConfig(
  companyId: string,
  systemPrompt: string,
  pineconeIndex?: string
) {
  try {
    if (!companyId || !systemPrompt) {
      console.error('Company ID and system prompt are required')
      process.exit(1)
    }

    // Check if company ID already exists
    const existing = await getChatConfigByCompanyId(companyId)
    if (existing) {
      console.error(
        `A configuration for company ID "${companyId}" already exists.`
      )
      process.exit(1)
    }

    const newConfig = await createChatConfig({
      company_id: companyId,
      system_prompt: systemPrompt,
      pinecone_index_name: pineconeIndex || undefined
    })

    console.log(`Configuration for ${companyId} created successfully:`)
    console.log(newConfig)
  } catch (error) {
    console.error('Error creating configuration:', error)
    process.exit(1)
  }
}

async function updateConfig(
  companyId: string,
  systemPrompt: string,
  pineconeIndex?: string
) {
  try {
    if (!companyId) {
      console.error('Company ID is required')
      process.exit(1)
    }

    // Check if company ID exists
    const existing = await getChatConfigByCompanyId(companyId)
    if (!existing) {
      console.error(`No configuration found for company ID "${companyId}".`)
      process.exit(1)
    }

    const updates: { system_prompt: string; pinecone_index_name?: string } = {
      system_prompt: systemPrompt
    }

    if (pineconeIndex !== undefined) {
      updates.pinecone_index_name = pineconeIndex
    }

    const updatedConfig = await updateChatConfig(companyId, updates)

    console.log(`Configuration for ${companyId} updated successfully:`)
    console.log(updatedConfig)
  } catch (error) {
    console.error('Error updating configuration:', error)
    process.exit(1)
  }
}

async function deleteConfig(companyId: string) {
  try {
    if (!companyId) {
      console.error('Company ID is required')
      process.exit(1)
    }

    if (companyId === 'default') {
      console.error('Cannot delete the default configuration.')
      process.exit(1)
    }

    // Check if company ID exists
    const existing = await getChatConfigByCompanyId(companyId)
    if (!existing) {
      console.error(`No configuration found for company ID "${companyId}".`)
      process.exit(1)
    }

    await deleteChatConfig(companyId)
    console.log(`Configuration for ${companyId} deleted successfully.`)
  } catch (error) {
    console.error('Error deleting configuration:', error)
    process.exit(1)
  }
}

async function main() {
  switch (command) {
    case 'list':
      await listConfigs()
      break
    case 'get':
      await getConfig(args[1])
      break
    case 'create':
      await createConfig(args[1], args[2], args[3])
      break
    case 'update':
      await updateConfig(args[1], args[2], args[3])
      break
    case 'delete':
      await deleteConfig(args[1])
      break
    case 'help':
    default:
      console.log(`
Chat Configuration CLI

Usage:
  chat-config list                           - List all configurations
  chat-config get <companyId>                - Get configuration for a specific company ID
  chat-config create <companyId> <prompt> [pineconeIndex] - Create a new configuration
  chat-config update <companyId> <prompt> [pineconeIndex] - Update an existing configuration
  chat-config delete <companyId>             - Delete a configuration
  chat-config help                           - Show this help message
`)
      break
  }
}

main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
