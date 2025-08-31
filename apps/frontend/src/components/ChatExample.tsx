import React, { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'

export const ChatExample: React.FC = () => {
  // Manual input state management (required in v5)
  const [input, setInput] = useState('')

  // useChat hook with transport configuration
  const { messages, sendMessage, status } = useChat({
    // Configure the API endpoint for your backend
    api: '/api/chat', // This should match your backend route
    // Alternative: you can use transport for more control
    // transport: new DefaultChatTransport({
    //   api: '/api/chat',
    //   headers: { 'Authorization': 'Bearer token' }
    // })
  })

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Send the message using sendMessage
    sendMessage({ 
      role: 'user',
      content: input 
    })
    
    // Clear the input
    setInput('')
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-96 max-w-md mx-auto border rounded-lg">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-muted-foreground text-center">
            Start a conversation...
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className="text-xs font-medium mb-1 opacity-70">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-sm">
                  {/* Handle message content - v5 uses content field */}
                  {typeof message.content === 'string' 
                    ? message.content 
                    : message.content
                  }
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {status === 'in_progress' && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground px-3 py-2 rounded-lg">
              <div className="text-xs font-medium mb-1 opacity-70">Assistant</div>
              <div className="text-sm">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={status === 'in_progress'}
            className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button 
            type="submit" 
            disabled={status === 'in_progress' || !input.trim()}
            size="sm"
          >
            Send
          </Button>
        </div>
        
        {/* Status indicator */}
        <div className="text-xs text-muted-foreground mt-1">
          Status: {status}
        </div>
      </form>
    </div>
  )
}
