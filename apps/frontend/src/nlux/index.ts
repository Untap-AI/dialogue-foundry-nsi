export type { AssistantPersona } from './core/src'

export type { ChatItem } from './shared/types/conversation'

export type { ErrorEventDetails } from '@nlux/core'

export { AiChat, useAsStreamAdapter, useAiChatApi } from './core/src'

export type { ConversationStarter } from './core/src/types/conversationStarter'
export type { AiChatProps } from './core/src/exports/props'
// Re-export DisplayOptions from the props file which imports it from @nlux/core
export type { DisplayOptions } from '@nlux/core'
