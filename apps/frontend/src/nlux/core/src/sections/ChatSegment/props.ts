import type { ConversationLayout } from '@nlux/core'
import type { ChatSegment } from '../../../../shared/types/chatSegment/chatSegment'
import type { ReactElement, RefObject } from 'react'
import type { MarkdownContainersController } from '../../exports/hooks/usMarkdownContainers'
import type { MessageOptions } from '../../exports/messageOptions'
import type { PersonaOptions } from '../../exports/personaOptions'

export type ChatSegmentProps<AiMsg> = {
  // State and option props
  chatSegment: ChatSegment<AiMsg>
  personaOptions?: PersonaOptions
  messageOptions?: MessageOptions<AiMsg>
  layout: ConversationLayout
  isInitialSegment: boolean

  containerRef?: RefObject<HTMLDivElement>
  markdownContainersController: MarkdownContainersController
  submitShortcutKey?: 'Enter' | 'CommandEnter'

  // Callbacks
  onPromptResubmit: (
    segmentId: string,
    messageId: string,
    newPrompt: string
  ) => void
  onMarkdownStreamRendered: (segmentId: string, messageId: string) => void

  // Only for email input chat item
  onEmailSubmit?: (email: string) => void
  emailLoading?: boolean
  emailError?: string | null
}

export type ChatSegmentImperativeProps<AiMsg> = {
  streamChunk: (messageId: string, chunk: AiMsg) => void
  completeStream: (messageId: string) => void
  cancelStreams: () => void
}
