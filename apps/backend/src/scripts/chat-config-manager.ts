#!/usr/bin/env node
/* eslint-disable no-console */
import readline from 'readline'
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Helper to prompt user for input
const promptUser = (question: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

// Display the menu
async function displayMenu(): Promise<void> {
  console.log('\n===== Chat Configuration Manager =====')
  console.log('1. List all configurations')
  console.log('2. Get configuration by domain')
  console.log('3. Create new configuration')
  console.log('4. Update configuration')
  console.log('5. Delete configuration')
  console.log('0. Exit')

  const choice = await promptUser('\nEnter your choice (0-5): ')

  switch (choice) {
    case '1':
      await listAllConfigs()
      break
    case '2':
      await getConfigByDomain()
      break
    case '3':
      await createNewConfig()
      break
    case '4':
      await updateConfig()
      break
    case '5':
      await deleteConfig()
      break
    case '0':
      console.log('Exiting...')
      rl.close()
      return
    default:
      console.log('Invalid choice. Please try again.')
  }

  // Return to menu unless user chose to exit
  if (choice !== '0') {
    await displayMenu()
  }
}

// List all configurations
async function listAllConfigs(): Promise<void> {
  try {
    const configs = await getAllChatConfigs()
    console.log('\n===== All Chat Configurations =====')

    if (configs.length === 0) {
      console.log('No configurations found.')
    } else {
      configs.forEach((config, index) => {
        console.log(`\n--- Configuration ${index + 1} ---`)
        console.log(`Domain: ${config.domain}`)
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
  }
}

// Get configuration by domain
async function getConfigByDomain(): Promise<void> {
  try {
    const domain = await promptUser('Enter domain: ')
    const config = await getChatConfigByDomain(domain)

    if (!config) {
      console.log(`No configuration found for domain "${domain}".`)
      return
    }

    console.log('\n===== Configuration Details =====')
    console.log(`Domain: ${config.domain}`)
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
  }
}

// Create new configuration
async function createNewConfig(): Promise<void> {
  try {
    const domain = await promptUser('Enter domain (e.g., example.com): ')

    // Check if domain already exists
    const existing = await getChatConfigByDomain(domain)
    if (existing) {
      console.log(`A configuration for domain "${domain}" already exists.`)
      return
    }

    const systemPrompt = await promptUser('Enter system prompt: ')
    if (!systemPrompt) {
      console.log('System prompt cannot be empty.')
      return
    }

    const pineconeIndex = await promptUser(
      'Enter Pinecone index name (optional, press Enter to skip): '
    )

    await createChatConfig({
      domain,
      system_prompt: systemPrompt,
      pinecone_index_name: pineconeIndex || undefined
    })

    console.log(`Configuration for domain "${domain}" created successfully.`)
  } catch (error) {
    console.error('Error creating configuration:', error)
  }
}

// Update configuration
async function updateConfig(): Promise<void> {
  try {
    const domain = await promptUser('Enter domain to update: ')

    // Check if domain exists
    const existing = await getChatConfigByDomain(domain)
    if (!existing) {
      console.log(`No configuration found for domain "${domain}".`)
      return
    }

    console.log('\nCurrent values:')
    console.log(`System Prompt: ${existing.system_prompt}`)
    console.log(`Pinecone Index: ${existing.pinecone_index_name || 'Not set'}`)

    const updateSystemPrompt = await promptUser('Update system prompt? (y/n): ')
    let systemPrompt
    if (updateSystemPrompt.toLowerCase() === 'y') {
      systemPrompt = await promptUser('Enter new system prompt: ')
      if (!systemPrompt) {
        console.log('System prompt cannot be empty.')
        return
      }
    }

    const updatePineconeIndex = await promptUser(
      'Update Pinecone index? (y/n): '
    )
    let pineconeIndex
    if (updatePineconeIndex.toLowerCase() === 'y') {
      pineconeIndex = await promptUser(
        'Enter new Pinecone index name (leave empty to remove): '
      )
    }

    const updates: {
      system_prompt?: string
      pinecone_index_name?: string | undefined
    } = {}

    if (systemPrompt) {
      updates.system_prompt = systemPrompt
    }

    if (updatePineconeIndex.toLowerCase() === 'y') {
      updates.pinecone_index_name = pineconeIndex || undefined
    }

    if (Object.keys(updates).length === 0) {
      console.log('No updates specified.')
      return
    }

    await updateChatConfig(domain, updates)
    console.log(`Configuration for domain "${domain}" updated successfully.`)
  } catch (error) {
    console.error('Error updating configuration:', error)
  }
}

// Delete configuration
async function deleteConfig(): Promise<void> {
  try {
    const domain = await promptUser('Enter domain to delete: ')

    if (domain === 'default') {
      console.log('Cannot delete the default configuration.')
      return
    }

    // Check if domain exists
    const existing = await getChatConfigByDomain(domain)
    if (!existing) {
      console.log(`No configuration found for domain "${domain}".`)
      return
    }

    const confirmation = await promptUser(
      `Are you sure you want to delete the configuration for "${domain}"? (y/n): `
    )

    if (confirmation.toLowerCase() !== 'y') {
      console.log('Deletion canceled.')
      return
    }

    await deleteChatConfig(domain)
    console.log(`Configuration for domain "${domain}" deleted successfully.`)
  } catch (error) {
    console.error('Error deleting configuration:', error)
  }
}

// Start the application
console.log('Starting Chat Configuration Manager...')
displayMenu().catch(error => {
  console.error('An error occurred:', error)
  rl.close()
})

// Handle application exit
rl.on('close', () => {
  console.log('Chat Configuration Manager closed.')
  process.exit(0)
})
