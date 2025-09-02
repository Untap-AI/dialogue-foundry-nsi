import {StrictMode} from 'react'
import { createRoot } from 'react-dom/client'
import ReactShadowRoot from 'react-shadow-root'
import App from './App'
import { ConfigProvider, type DialogueFoundryConfig } from './contexts/ConfigContext'
import { initLogger } from './services/logger'
import cssContent from "./index.css?inline"
import { normalizeTailwindForShadowDOM } from './lib/shadow-dom-utils'

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

  // Create React root directly on the provided element
  const root = createRoot(rootElement)

  // Render app with Shadow DOM isolation using react-shadow-root
  root.render(
    <ReactShadowRoot>
      <style>{normalizeTailwindForShadowDOM(cssContent)}</style>
      <div id="dialogue-foundry-app">
        <StrictMode>
          <ConfigProvider initialConfig={options}>
            <App />
          </ConfigProvider>
        </StrictMode>
      </div>
    </ReactShadowRoot>
  )

  return { root }
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
