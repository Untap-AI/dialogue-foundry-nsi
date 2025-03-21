import { useEffect, useState } from 'react'
import { AiChat, useAsStreamAdapter } from '@nlux/react'
import reactLogo from './assets/react.svg'
import nluxLogo from './assets/nlux.svg'
// Keeping App.css for now as we migrate
import './App.css'

import { streamMessage } from './services/streaming'
import { initializeChat, startNewChat } from './services/api'
import type { ChatItem } from '@nlux/react'
import '@nlux/themes/nova.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [initialMessages, setInitialMessages] = useState<ChatItem[]>([])

  useEffect(() => {
    // Initialize chat on component mount
    const setupChat = async () => {
      try {
        setIsLoading(true)
        const chatInit = await initializeChat()
        setChatId(chatInit.chatId)

        console.log(chatInit.messages)

        setInitialMessages(chatInit.messages)
      } catch (error) {
        console.error('Failed to initialize chat:', error)
      } finally {
        setIsLoading(false)
      }
    }

    setupChat()
  }, [])

  // Create adapter using our streaming service
  const adapter = useAsStreamAdapter((message, observer) => {
    streamMessage(
      message,
      // On each chunk update
      chunk => observer.next(chunk),
      // On complete
      () => observer.complete(),
      // On error
      error => observer.error(error)
    )
  }, initialMessages)

  // Handle starting a new chat
  const handleNewChat = async () => {
    setIsLoading(true)
    try {
      const chatInit = await startNewChat()
      setChatId(chatInit.chatId)
      setInitialMessages([])
      // Force reload of the chat component by changing the key
      // This is a workaround to reset the chat UI
      window.location.reload()
    } catch (error) {
      console.error('Failed to start new chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex gap-6 mb-4">
        <a
          href="https://docs.nlkit.com/nlux"
          target="_blank"
          className="hover:opacity-80 transition-opacity"
          rel="noreferrer"
        >
          <img src={nluxLogo} className="h-16 w-auto" alt="NLUX logo" />
        </a>
        <a
          href="https://react.dev"
          target="_blank"
          className="hover:opacity-80 transition-opacity"
          rel="noreferrer"
        >
          <img
            src={reactLogo}
            className="h-16 w-auto animate-spin-slow"
            alt="React logo"
          />
        </a>
      </div>
      <h1 className="text-4xl font-bold mb-8 text-center">
        Dialogue Foundry Chat
      </h1>

      {isLoading ? (
        <div className="w-full max-w-2xl flex justify-center items-center min-h-[350px]">
          <p>Loading chat...</p>
        </div>
      ) : (
        <>
          <div className="w-full max-w-2xl flex justify-end mb-2">
            <button
              onClick={handleNewChat}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              New Chat
            </button>
          </div>
          <div className="w-full max-w-2xl min-h-[350px] p-4 rounded-lg shadow-md">
            <AiChat
              adapter={adapter}
              key={chatId} // Add a key to force re-render when chatId changes
              initialConversation={initialMessages}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default App
