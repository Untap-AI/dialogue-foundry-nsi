import React from 'react'
import ReactDOM from 'react-dom/client'
// Note: We don't need to import global CSS here as it's handled by the Vite plugin
// Component CSS files are imported directly in their respective components
import App from './App'
import { ConfigProvider } from './contexts/ConfigContext'

// For production builds, CSS will be included through the normal build process
// The development CSS is injected via the script in index.html

// Define interface for configuration options
interface DialogueFoundryOptions {
  // Add any configuration options here
  theme?: 'light' | 'dark'
  // Add more options as needed
}

/**
 * Initialize the DialogueFoundry application
 * @param rootElement - The DOM element to mount the app to
 * @param options - Configuration options for the app
 */
function init(
  rootElement: HTMLElement | null,
  options: DialogueFoundryOptions = {}
) {
  if (!rootElement) {
    console.error('DialogueFoundry: Root element not found')
    return
  }

  // Create React root
  const root = ReactDOM.createRoot(rootElement)

  // Render app with config context
  root.render(
    <React.StrictMode>
      <ConfigProvider initialConfig={options}>
        <App />
      </ConfigProvider>
    </React.StrictMode>
  )

  return root
}

// Auto-initialize if in standard mode (not being used as a library)
if (typeof window !== 'undefined' && !window.DialogueFoundry) {
  const rootElement = document.getElementById('root')
  if (rootElement) {
    init(rootElement)
  }
}

// Export public API
export { init }

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
