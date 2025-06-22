import type { JSX } from 'react'

export interface AssistantPersona {
  avatar: string | JSX.Element
  name: string
  tagline?: string
}

interface UserPersona {
  avatar: string | JSX.Element
  name: string
}

export interface PersonaOptions {
  assistant?: AssistantPersona
  user?: UserPersona
}
