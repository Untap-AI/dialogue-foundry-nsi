import type {
  ComposerOptions,
  DisplayOptions,
  EventsConfig,
  StandardChatAdapter
} from '@nlux/core'
import type { ChatAdapterBuilder } from '../../../shared/types/adapters/chat/chatAdapterBuilder'
import type { ChatItem } from '../../../shared/types/conversation'
import type { ReactNode } from 'react'
import type { ChatAdapter } from '../types/chatAdapter'
import type { ConversationOptions } from '../types/conversationOptions'
import type { AiChatApi } from './hooks/useAiChatApi'
import type { MessageOptions } from './messageOptions'
import type { PersonaOptions } from './personaOptions'

/**
 * Props for the AiChat React component.
 */
export type AiChatProps<AiMsg = string> = {
  /**
   * The chat adapter to use. This is required and essential for the component to work.
   * You can either provide a standard adapter from @nlux or create a custom adapter.
   */
  adapter:
    | ChatAdapter<AiMsg>
    | StandardChatAdapter<AiMsg>
    | ChatAdapterBuilder<AiMsg>

  /**
   * The API to use for submitting messages. This is use for an imperative control of the chat,
   * to perform actions such as submitting messages from outside the chat.
   */
  api?: AiChatApi

  /**
   * A map of event handlers.
   */
  events?: EventsConfig<AiMsg>

  /**
   * The class name to add to the root element of the component.
   */
  className?: string

  /**
   * The initial conversation history to display.
   * This is not a reactive prop! Changing it after the component is mounted will not update the conversation.
   */
  initialConversation?: ChatItem<AiMsg>[]

  /**
   * Display options, such as color scheme, width, etc.
   */
  displayOptions?: DisplayOptions

  /**
   * Options for the conversation.
   */
  conversationOptions?: ConversationOptions

  /**
   * Options related to a single message in the conversation.
   */
  messageOptions?: MessageOptions<AiMsg>

  /**
   * Options for the composer.
   */
  composerOptions?: ComposerOptions

  /**
   * Options for the persona.
   */
  personaOptions?: PersonaOptions

  /**
   * The children of the component, in case you want to render something inside the chat.
   * Only NLUX UI overrides are accepted at this stage.
   */
  children?: ReactNode | undefined

  /**
   * Whether to show the email input chat item.
   */
  showEmailInput?: boolean
  onEmailSubmit: (email: string) => void
  emailLoading: boolean
  emailError: string | null
}
