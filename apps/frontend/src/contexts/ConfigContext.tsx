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
}

// Default configuration
export const defaultConfig: DialogueFoundryConfig = {
  chatConfig: {
    apiBaseUrl: 'http://localhost:3000/api',
    companyId: 'west-hills-vineyards'
  },
  theme: 'light',
  title: 'West Hills Vineyards',

  // TODO: Check logo
  logoUrl:
    'https://static.wixstatic.com/media/c08e45_c5e66d5c2c314678981ddb4312eb3c9f~mv2.png/v1/fill/w_838,h_494,fp_0.48_0.49,q_90,usm_0.66_1.00_0.01,enc_avif,quality_auto/c08e45_c5e66d5c2c314678981ddb4312eb3c9f~mv2.png',

  personaOptions: {
    assistant: {
      name: 'West Hills Vineyard Expert',
      tagline: 'Ask me anything about West Hills Vineyard',
      avatar:
        'https://michigangrown.org/wp-content/uploads/2022/09/grapes-wine-main-updated-1024x683.jpg'
    }
  }
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
  initialConfig = {}
}: ConfigProviderProps) {
  const [config, setConfigState] = useState<DialogueFoundryConfig>({
    ...defaultConfig,
    ...initialConfig
  })
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    // Function to load config from an external JSON file
    const loadExternalConfig = async () => {
      if (process.env.NODE_ENV === 'development') {
        setConfigLoaded(true)
        return
      }

      try {
        // Try to load from a script tag with id="dialogue-foundry-config"
        const configScript = document.getElementById('dialogue-foundry-config')
        if (configScript && configScript.textContent) {
          try {
            const parsedConfig = JSON.parse(configScript.textContent)
            console.log('Found config in script tag', parsedConfig)
            setConfigState(parsedConfig)
            setConfigLoaded(true)
            return
          } catch (parseError) {
            console.error('Error parsing config from script tag:', parseError)
          }
        }
      } catch (error) {
        console.error('Error loading dialogue foundry configuration:', error)
      }
    }

    loadExternalConfig()
  }, [])

  // Don't render children until config is loaded
  if (!configLoaded) {
    // eslint-disable-next-line no-null/no-null
    return null // Return null instead of undefined for React components
  }

  return (
    <ConfigContext.Provider value={{ ...config }}>
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
