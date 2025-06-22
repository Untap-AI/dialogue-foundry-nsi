import { useMemo } from 'react'
import { chatSegmentsToChatItems } from '../../../../shared/utils/chat/chatSegmentsToChatItems'
import { reactPropsToCorePropsInEvents } from '../../utils/reactPropsToCorePropsInEvents'
import type { ChatAdapterExtras } from '../../../../shared/types/adapters/chat/chatAdapterExtras'
import type { ChatSegment } from '../../../../shared/types/chatSegment/chatSegment'
import type { AiChatProps } from '../props'

type HistoryPayloadSize = number | 'max'

export const useAdapterExtras = <AiMsg>(
  aiChatProps: AiChatProps<AiMsg>,
  chatSegments: ChatSegment<AiMsg>[],
  historyPayloadSize?: HistoryPayloadSize
): ChatAdapterExtras<AiMsg> => {
  return useMemo(() => {
    const allHistory = chatSegmentsToChatItems(chatSegments)
    const conversationHistory =
      historyPayloadSize === 'max' || historyPayloadSize === undefined
        ? allHistory
        : historyPayloadSize > 0
          ? allHistory.slice(-historyPayloadSize)
          : undefined

    return {
      aiChatProps: reactPropsToCorePropsInEvents<AiMsg>(aiChatProps),
      conversationHistory
    }
  }, [aiChatProps, chatSegments, historyPayloadSize])
}
