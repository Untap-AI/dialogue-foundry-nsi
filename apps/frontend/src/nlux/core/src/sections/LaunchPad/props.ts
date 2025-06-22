import type { ChatSegment } from '../../../../shared/types/chatSegment/chatSegment'
import type { ReactNode } from 'react'
import type { PersonaOptions } from '../../exports/personaOptions'
import type { ConversationOptions } from '../../types/conversationOptions'
import type { ConversationStarter } from '../../types/conversationStarter'

export type LaunchPadProps<AiMsg> = {
  segments: ChatSegment<AiMsg>[]
  personaOptions?: PersonaOptions
  conversationOptions?: ConversationOptions
  onConversationStarterSelected: (
    conversationStarter: ConversationStarter
  ) => void
  userDefinedGreeting?: ReactNode
}
