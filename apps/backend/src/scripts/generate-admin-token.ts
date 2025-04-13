/**
 * Admin Token Generator Script
 *
 * This script generates an admin JWT token for use with the API.
 * Run it locally to avoid sending admin credentials over the network.
 *
 * Usage via npm script:
 *   npm run admin:token [userId]
 */

import * as readline from 'readline'
import path from 'path'
import dotenv from 'dotenv'
import { generateAdminAccessToken } from '../lib/jwt-utils'
import { logger } from '../lib/logger'

// Load environment variables from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Check for required environment variables
if (!process.env.ADMIN_JWT_SECRET) {
  logger.error('ADMIN_JWT_SECRET environment variable is not set', {
    service: 'generate-admin-token'
  })
  console.error('Please set it in your .env file and try again.')
  process.exit(1)
}

// Get user ID from command line or prompt
async function main() {
  // Check if running from npm script which adds extra args, or directly with ts-node
  const args = process.argv.slice(2)
  let userId = args[0]

  if (!userId) {
    userId = await promptForUserId()
  }

  // Generate the token
  const token = generateAdminAccessToken(userId)
  const expiryHours =
    (process.env.ADMIN_JWT_EXPIRY
      ? parseInt(process.env.ADMIN_JWT_EXPIRY)
      : 43200) / 3600

  console.log('\n-------- ADMIN ACCESS TOKEN --------')
  console.log(`\nToken for user "${userId}":\n`)
  console.log(token)
  console.log(`\nThis token will expire in ${expiryHours} hours.`)
  console.log(
    '\nUse this token in your API requests with the Authorization header:'
  )
  console.log(`Authorization: Bearer ${token}`)
  console.log('\nExample curl command:')
  console.log(
    `curl -H "Authorization: Bearer ${token}" http://localhost:${process.env.PORT || 3001}/api/cache/stats`
  )
  console.log('\n-----------------------------------')
}

async function promptForUserId(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question('Enter user ID (e.g. admin@example.com): ', userId => {
      rl.close()
      resolve(userId || 'admin-user')
    })
  })
}

// Run the script
main().catch(error => {
  logger.error('Error generating admin token', {
    error: error as Error,
    service: 'generate-admin-token'
  })
  process.exit(1)
})
