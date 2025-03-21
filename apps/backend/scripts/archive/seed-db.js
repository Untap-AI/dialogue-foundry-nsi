#!/usr/bin/env node

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const { v4: uuidv4 } = require('uuid')

// Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Sample data
const testUsers = [
  { id: uuidv4(), email: 'user1@example.com' },
  { id: uuidv4(), email: 'user2@example.com' }
]

const testChats = [
  {
    id: uuidv4(),
    user_id: testUsers[0].id,
    name: 'First Conversation'
  },
  {
    id: uuidv4(),
    user_id: testUsers[0].id,
    name: 'Technical Chat'
  },
  {
    id: uuidv4(),
    user_id: testUsers[1].id,
    name: 'Work Meeting'
  }
]

const testMessages = [
  // Messages for first chat
  {
    id: uuidv4(),
    chat_id: testChats[0].id,
    user_id: testUsers[0].id,
    content: 'Hello, how can you help me today?',
    role: 'user',
    sequence_number: 1
  },
  {
    id: uuidv4(),
    chat_id: testChats[0].id,
    user_id: testUsers[0].id,
    content:
      'I can help with various tasks like answering questions, drafting emails, explaining concepts, and more. What would you like assistance with?',
    role: 'assistant',
    sequence_number: 2
  },

  // Messages for second chat
  {
    id: uuidv4(),
    chat_id: testChats[1].id,
    user_id: testUsers[0].id,
    content: 'How do I implement a binary search algorithm?',
    role: 'user',
    sequence_number: 1
  },
  {
    id: uuidv4(),
    chat_id: testChats[1].id,
    user_id: testUsers[0].id,
    content: 'To implement a binary search algorithm...',
    role: 'assistant',
    sequence_number: 2
  },

  // Messages for third chat
  {
    id: uuidv4(),
    chat_id: testChats[2].id,
    user_id: testUsers[1].id,
    content: "Can you help me draft an agenda for tomorrow's meeting?",
    role: 'user',
    sequence_number: 1
  },
  {
    id: uuidv4(),
    chat_id: testChats[2].id,
    user_id: testUsers[1].id,
    content: "Certainly! Here's a draft agenda...",
    role: 'assistant',
    sequence_number: 2
  }
]

// Seed the database
async function seedDatabase() {
  try {
    console.info('Seeding database...')

    // In a real application, you would create users via auth.signUp
    // For this example, we'll just pretend they exist and use their IDs
    console.info(
      'Users created (simulated):',
      testUsers.map(u => u.id).join(', ')
    )

    // Insert chats
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .insert(testChats)
      .select()

    if (chatsError) {
      throw new Error(`Error inserting chats: ${chatsError.message}`)
    }

    console.info(`${chatsData.length} chats inserted`)

    // Insert messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .insert(testMessages)
      .select()

    if (messagesError) {
      throw new Error(`Error inserting messages: ${messagesError.message}`)
    }

    console.info(`${messagesData.length} messages inserted`)

    console.info('Database seeded successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
  }
}

seedDatabase()
