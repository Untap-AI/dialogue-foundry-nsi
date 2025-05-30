import type { ConversationLayout, DataTransferMode } from '@nlux/core'
import type { MessageDirection } from '../../../../shared/components/Message/props'
import type { ReactElement, ReactNode } from 'react'
import type { MarkdownContainersController } from '../../exports/hooks/usMarkdownContainers'
import type { MessageOptions } from '../../exports/messageOptions'

export type ChatItemProps<AiMsg> = {
  uid: string
  status: 'streaming' | 'complete'
  direction: MessageDirection
  contentType: 'text' | 'server-component' | 'email_input'
  dataTransferMode: DataTransferMode

  markdownContainersController: MarkdownContainersController
  onMarkdownStreamRendered?: (chatItemId: string) => void

  fetchedContent?: AiMsg | ReactNode
  fetchedServerResponse?: unknown
  streamedContent?: AiMsg[]
  streamedServerResponse?: Array<unknown>

  messageOptions?: MessageOptions<AiMsg>
  layout: ConversationLayout
  isPartOfInitialSegment: boolean
  name: string
  avatar?: string | ReactElement
  submitShortcutKey?: 'Enter' | 'CommandEnter'
  onPromptResubmit?: (newPrompt: string) => void

  // Only for email input chat item
  onEmailSubmit?: (email: string) => void
  emailLoading?: boolean
  emailError?: string | null
}

export type ChatItemImperativeProps<AiMsg> = {
  streamChunk: (chunk: AiMsg) => void
  completeStream: () => void
  cancelStream: () => void
}
