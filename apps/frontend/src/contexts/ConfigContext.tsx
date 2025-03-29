import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ChatConfig } from '../services/api'

// Define the Config type that extends ChatConfig and includes any other app-wide settings
export interface DialogueFoundryConfig extends ChatConfig {
  // Chat interface customization
  personaOptions?: {
    assistant?: {
      name?: string
      avatar?: string
      tagline?: string
    }
  }
  // Theme customization
  theme?: {
    colorScheme?: 'light' | 'dark'
    fontFamily?: string
    fontSize?: string
    backgroundColor?: string
    textColor?: string
    userMessageBgColor?: string
    userMessageTextColor?: string
    assistantMessageBgColor?: string
    assistantMessageTextColor?: string
    primaryButtonBgColor?: string
    primaryButtonTextColor?: string
    darkMode?: {
      backgroundColor?: string
      textColor?: string
      userMessageBgColor?: string
      userMessageTextColor?: string
      assistantMessageBgColor?: string
      assistantMessageTextColor?: string
    }
  }
  // Widget customization
  widget?: {
    position?: 'bottom-right' | 'bottom-left'
    buttonColor?: string
    defaultOpen?: boolean
  }
  // Initial messages
  initialMessages?: any[]
  // Any other configuration options
  [key: string]: any
}

// Default configuration
export const defaultConfig: DialogueFoundryConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  tokenStorageKey: 'chat_access_token',
  chatIdStorageKey: 'chat_id',
  theme: {
    colorScheme: 'light',
  },
  widget: {
    position: 'bottom-right',
    buttonColor: '#2563eb',
    defaultOpen: false
  }
}

// Create the context with default values
export const ConfigContext = createContext<{
  config: DialogueFoundryConfig
  setConfig: (config: Partial<DialogueFoundryConfig>) => void
}>({
  config: defaultConfig,
  setConfig: () => {}
})

// Custom hook to use the config context
export const useConfig = () => useContext(ConfigContext)

interface ConfigProviderProps {
  children: ReactNode
  initialConfig?: Partial<DialogueFoundryConfig>
}

export const ConfigProvider = ({ 
  children, 
  initialConfig = {} 
}: ConfigProviderProps) => {
  const [config, setConfigState] = useState<DialogueFoundryConfig>({
    ...defaultConfig,
    ...initialConfig
  })
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    // Function to load config from an external JSON file
    const loadExternalConfig = async () => {
      try {
        // Look for the config in the global window object first
        if (window.dialogueFoundryConfig) {
          console.log('Found config in window object', window.dialogueFoundryConfig)
          setConfigState(prevConfig => ({
            ...prevConfig,
            ...window.dialogueFoundryConfig
          }))
          setConfigLoaded(true)
          return
        }

        // Try to load from a script tag with id="dialogue-foundry-config"
        const configScript = document.getElementById('dialogue-foundry-config')
        if (configScript && configScript.textContent) {
          try {
            const parsedConfig = JSON.parse(configScript.textContent)
            console.log('Found config in script tag', parsedConfig)
            setConfigState(prevConfig => ({
              ...prevConfig,
              ...parsedConfig
            }))
            setConfigLoaded(true)
            return
          } catch (parseError) {
            console.error('Error parsing config from script tag:', parseError)
          }
        }

        // If no config is found in the global object or script tag,
        // try to fetch from a JSON file
        try {
          const response = await fetch('/dialogue-foundry-config.json')
          if (response.ok) {
            const externalConfig = await response.json()
            console.log('Loaded config from external JSON file', externalConfig)
            setConfigState(prevConfig => ({
              ...prevConfig,
              ...externalConfig
            }))
          }
        } catch (fetchError) {
          console.log('No external config file found or error loading it:', fetchError)
        }

        // Mark as loaded even if we couldn't find an external config
        setConfigLoaded(true)
      } catch (error) {
        console.error('Error loading configuration:', error)
        setConfigLoaded(true) // Continue with default config
      }
    }

    loadExternalConfig()
  }, [])

  // Function to update config (partial updates)
  const setConfig = (newConfig: Partial<DialogueFoundryConfig>) => {
    setConfigState(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }))
  }

  // Don't render children until config is loaded
  if (!configLoaded) {
    return null // Or a loading spinner
  }

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
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