import React from 'react'
import ReactDOM from 'react-dom/client'
// Note: We don't need to import global CSS here as it's handled by the Vite plugin
// Component CSS files are imported directly in their respective components
import App from './App'
import { ConfigProvider } from './contexts/ConfigContext'

// For production builds, CSS will be included through the normal build process
// The development CSS is injected via the script in index.html

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
