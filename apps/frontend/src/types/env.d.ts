/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly VITE_SENTRY_DSN: string
  readonly VITE_API_BASE_URL: string
}

// This ensures the ImportMeta interface has the env property globally
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
