# AI SDK v5 - Backend API Example

For the frontend `useChat` to work, you need a backend API endpoint that follows the AI SDK streaming format.

## Backend Example (Node.js/Express)

```typescript
// apps/backend/src/routes/chat-routes.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai' // or your preferred provider

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body

  try {
    const result = await streamText({
      model: openai('gpt-3.5-turbo'),
      messages: messages,
      system: 'You are a helpful assistant.',
    })

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')

    // Stream the response
    for await (const chunk of result.textStream) {
      res.write(chunk)
    }

    res.end()
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})
```

## Key AI SDK Concepts

### 1. **useChat Hook Returns:**
```typescript
const {
  messages,      // Array of chat messages
  sendMessage,   // Function to send a new message
  status,        // 'ready' | 'in_progress' | 'error'
  reload,        // Function to reload/retry last message
  stop,          // Function to stop current generation
  setMessages,   // Function to manually set messages
} = useChat(options)
```

### 2. **sendMessage Function:**
```typescript
// Basic usage
sendMessage({ 
  role: 'user', 
  content: 'Hello!' 
})

// With additional options
sendMessage({ 
  role: 'user', 
  content: 'Hello!',
  data: { userId: '123' } // Custom data
})
```

### 3. **Message Structure (v5):**
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string | Array<ContentPart>
  createdAt?: Date
  data?: any // Custom data
}
```

### 4. **Status Values:**
- `'ready'` - Ready to send messages
- `'in_progress'` - Currently generating response
- `'error'` - An error occurred

### 5. **Configuration Options:**
```typescript
useChat({
  api: '/api/chat',           // API endpoint
  headers: {},                // Custom headers
  body: {},                   // Additional body data
  credentials: 'include',     // CORS credentials
  initialMessages: [],        // Starting messages
  onResponse: (response) => {}, // Response callback
  onFinish: (message) => {},    // Completion callback
  onError: (error) => {},       // Error callback
})
```
