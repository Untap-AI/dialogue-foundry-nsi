import { useConfig } from '../../../../../contexts/ConfigContext'
import type { ConversationStarter } from '../../types/conversationStarter'
import type { ConversationStartersProps } from './props'
import { useMemo } from 'react'
import { ChatApiService } from '../../../../../services/api'

const ConversationStarterIcon = ({
  icon
}: {
  icon: ConversationStarter['icon']
}) => {
  if (!icon) {
    return null
  }
  if (typeof icon === 'string') {
    return <img src={icon} width={16} />
  }
  return (
    <div className="nlux-comp-conversationStarter-icon-container">{icon}</div>
  )
}

export const ConversationStarters = (props: ConversationStartersProps) => {
  const { onConversationStarterSelected } = props

  const {
    chatConfig,
  } = useConfig()

  // Create analytics service for tracking conversation starter clicks
  const analyticsService = useMemo(
    () => new ChatApiService(chatConfig),
    [chatConfig]
  )

  const handleConversationStarterClick = (conversationStarter: ConversationStarter, index: number) => {
    onConversationStarterSelected(conversationStarter)
    analyticsService.recordConversationStarterClick(conversationStarter.label, index + 1, conversationStarter.prompt ?? '')
  }

  return (
    <div className="nlux-comp-conversationStarters">
      {props.items.map((conversationStarter, index) => (
        <button
          key={index}
          className="nlux-comp-conversationStarter"
          onClick={() => handleConversationStarterClick(conversationStarter, index)}
        >
          <ConversationStarterIcon icon={conversationStarter.icon} />
          <span className="nlux-comp-conversationStarter-prompt">
            {conversationStarter.label ?? conversationStarter.prompt}
          </span>
        </button>
      ))}
    </div>
  )
}
