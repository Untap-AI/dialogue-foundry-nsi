import React from 'react'
import { createRoot } from 'react-dom/client'
import { Widget } from './Widget'
import './index.css'

// Function to create and render the widget in a target element
function createWidget(targetElement: HTMLElement | string, options = {}) {
  const rootElement =
    typeof targetElement === 'string'
      ? document.querySelector(targetElement)
      : targetElement

  if (!rootElement) {
    console.error('Target element not found:', targetElement)
    return
  }

  const root = createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <Widget {...options} />
    </React.StrictMode>
  )

  return {
    unmount: () => root.unmount()
  }
}

// Auto-initialize if the element exists
const autoInitElement = document.getElementById('dialogue-foundry-root')
if (autoInitElement) {
  createWidget(autoInitElement)
}

// Export for usage in other applications
export { Widget, createWidget }

// For UMD build
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).DialogueFoundry = {
    Widget,
    createWidget
  }
}
