import type { ChatSegment } from '../../../../shared/types/chatSegment/chatSegment'
import type { MarkdownContainersController } from '../../exports/hooks/usMarkdownContainers'
import type { MessageOptions } from '../../exports/messageOptions'
import type { PersonaOptions } from '../../exports/personaOptions'
import type { ConversationOptions } from '../../types/conversationOptions'

export type ConversationCompProps<AiMsg> = {
  // State and option props
  segments: ChatSegment<AiMsg>[]
  conversationOptions?: ConversationOptions
  personaOptions?: PersonaOptions
  messageOptions?: MessageOptions<AiMsg>
  markdownContainersController: MarkdownContainersController
  submitShortcutKey?: 'Enter' | 'CommandEnter'

  // Event Handlers
  onLastActiveSegmentChange?: (
    data:
      | {
          uid: string
          div: HTMLDivElement
        }
      | undefined
  ) => void

  onPromptResubmit: (
    segmentId: string,
    messageId: string,
    newPrompt: string
  ) => void

  onMarkdownStreamRendered: (segmentId: string, messageId: string) => void
}

export type ImperativeConversationCompProps<AiMsg> = {
  streamChunk: (segmentId: string, messageId: string, chunk: AiMsg) => void
  completeStream: (segmentId: string, messageId: string) => void
  cancelSegmentStreams: (segmentId: string) => void
}
