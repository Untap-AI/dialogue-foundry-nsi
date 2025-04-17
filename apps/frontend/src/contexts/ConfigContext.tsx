import { createContext, useContext, useState, useEffect } from 'react'
import type {
  ConversationStarter,
  DisplayOptions,
  PersonaOptions
} from '@nlux/react'
import type { ReactNode } from 'react'
import type { ChatConfig } from '../services/api'

// Define the Config type that extends ChatConfig and includes any other app-wide settings
export interface DialogueFoundryConfig {
  // Chat interface customization
  personaOptions?: PersonaOptions
  theme?: DisplayOptions['colorScheme']
  conversationStarters?: ConversationStarter[]

  // Chat Config
  // TODO: Look into fixing this
  chatConfig: ChatConfig

  // Widget customization
  title: string
  logoUrl?: string

  // Welcome popup configuration
  popupMessage?: string
}

// Default configuration
export const defaultConfig: DialogueFoundryConfig = {
  chatConfig: {
    apiBaseUrl:
      (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ||
      'http://localhost:3000/api',
    companyId: 'west-hills-vineyards'
  },

  // TODO: Check logo
  logoUrl:
    'https://gtlandscapesolutions.com/wp-content/uploads/logo_gt_landcape_solutions_centered.png',

  "title": "GT landscape solutions",
  "personaOptions": {
    "assistant": {
      "name": "GT Landscape Expert",
      "tagline": "Ask me anything about GT",
      "avatar": ''
    }
  },
  "popupMessage": "Have questions? Click here for help!"
}

// Create the context with default values
export const ConfigContext = createContext<DialogueFoundryConfig>(defaultConfig)

// Custom hook to use the config context
export const useConfig = () => useContext(ConfigContext)

interface ConfigProviderProps {
  children: ReactNode
  initialConfig?: Partial<DialogueFoundryConfig>
}

// Define the ConfigProvider as a named function component rather than an arrow function
// This helps Fast Refresh identify the component correctly
export function ConfigProvider({
  children,
}: ConfigProviderProps) {
  const [config, setConfigState] = useState<DialogueFoundryConfig | undefined>(undefined)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    // Function to load config from an external JSON file
    const loadExternalConfig = async () => {
      if (
        (import.meta.env as { VITE_ENV?: string }).VITE_ENV === 'development'
      ) {
        console.log('Loading development config')
        setConfigState(defaultConfig)
        setConfigLoaded(true)
        return
      }

      try {
        // Try to load from a script tag with id="dialogue-foundry-config"
        const configScript = document.getElementById('dialogue-foundry-config')

        if (configScript && configScript.textContent) {
          try {
            // Extract the actual JSON content, ignoring any comments.
            const textContent = configScript.textContent.trim()
            let jsonContent = textContent

            // If there are comments in the text content, try to extract just the JSON
            if (textContent.includes('/*') || textContent.includes('//')) {
              // Simple regex to extract JSON - this assumes the JSON is a complete object
              const jsonMatch = textContent.match(/(\{[\s\S]*\})/)
              if (jsonMatch) {
                jsonContent = jsonMatch[1]
              }
            }

            const parsedConfig = JSON.parse(jsonContent)

            // If API URL is a placeholder, replace it with the actual URL
            if (parsedConfig.chatConfig?.apiBaseUrl === 'RUNTIME_PLACEHOLDER') {
              parsedConfig.chatConfig.apiBaseUrl =
                window.location.hostname === 'localhost'
                  ? 'http://localhost:3000/api'
                  : `${window.location.origin}/api`
            }

            console.log('Found config in script tag', parsedConfig)
            setConfigState(parsedConfig)
            setConfigLoaded(true)
            return
          } catch (parseError) {
            console.error('Error parsing config from script tag:', parseError)
          }
        }

        // If no config was found, just use defaults
        console.log('No external config found, using defaults')
        setConfigState(defaultConfig)
        setConfigLoaded(true)
      } catch (error) {
        console.error('Error loading dialogue foundry configuration:', error)
        setConfigLoaded(true)
      }
    }

    loadExternalConfig()
  }, [])

  // Don't render children until config is loaded
  if (!configLoaded) {
    // eslint-disable-next-line no-null/no-null
    return null // Return null instead of undefined for React components
  }

  const finalConfig = config ?? defaultConfig

  return (
    <ConfigContext.Provider value={{ ...finalConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

// Add TypeScript interface for the global window object
declare global {
  interface Window {
    dialogueFoundryConfig?: Partial<DialogueFoundryConfig>
  }
}
