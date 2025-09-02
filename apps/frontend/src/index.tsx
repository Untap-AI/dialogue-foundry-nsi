import {StrictMode} from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfigProvider, type DialogueFoundryConfig } from './contexts/ConfigContext'
import { initLogger } from './services/logger'
import cssContent from "./index.css?inline";

/**
 * Initialize the DialogueFoundry application with Shadow DOM isolation
 * @param rootElement - The DOM element to mount the app to
 * @param options - Configuration options for the app
 */
async function init(
  rootElement: HTMLElement | null,
  options: Partial<DialogueFoundryConfig> = {}
) {
  if (!rootElement) {
    console.error('DialogueFoundry: Root element not found')
    return
  }

  // Initialize logger asynchronously
  await initLogger({
    dsn: import.meta.env.VITE_SENTRY_DSN
  })

  // Create Shadow DOM for complete style isolation
  const shadowRoot = rootElement.attachShadow({ mode: 'open' })
  
  // Create the app container inside the shadow DOM
  const appContainer = document.createElement('div')
  appContainer.id = 'dialogue-foundry-app'
  
  // Add our CSS to the shadow DOM
  const style = document.createElement('style')
  style.textContent = cssContent.replace(
    '((-webkit-hyphens: none) and (not (margin-trim: inline)))',
    '(not (margin-trim: inline))'
  )
  shadowRoot.appendChild(style)
  
  // Add app container to shadow DOM
  shadowRoot.appendChild(appContainer)

  // Create React root in the shadow DOM container
  const root = createRoot(appContainer)

  // Render app with config context
  root.render(
    <StrictMode>
      <ConfigProvider initialConfig={options}>
        <App />
      </ConfigProvider>
    </StrictMode>
  )

  return { root, shadowRoot, appContainer }
}

// Auto-initialize if in standard mode (not being used as a library)
if (typeof window !== 'undefined' && !window.DialogueFoundry) {
  // Create a container div for the app
  const appContainer = document.createElement('div')
  appContainer.id = 'dialogue-foundry-app'
  document.body.appendChild(appContainer)

  // Initialize the app in the container
  init(appContainer).catch(error => {
    console.error('Failed to initialize DialogueFoundry:', error)
  })
}

// Expose the API to window for non-module usage
if (typeof window !== 'undefined') {
  window.DialogueFoundry = {
    init
  }
}

// Add DialogueFoundry to window type
declare global {
  interface Window {
    DialogueFoundry?: {
      init: typeof init
    }
  }
}
