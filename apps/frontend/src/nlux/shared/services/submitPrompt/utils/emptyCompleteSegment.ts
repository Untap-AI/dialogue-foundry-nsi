import { uid } from '../../../utils/uid'
import { triggerAsyncCallback } from './triggerAsyncCallback'
import type { ChatSegment } from '../../../types/chatSegment/chatSegment'
import type {
  ChatSegmentCompleteCallback,
  ChatSegmentEventsMap
} from '../../../types/chatSegment/chatSegmentEvents'
import type { ChatSegmentObservable } from '../../../types/chatSegment/chatSegmentObservable'

export const createEmptyCompleteSegment = <AiMsg>(): {
  segment: ChatSegment<AiMsg>
  observable: ChatSegmentObservable<AiMsg>
  dataTransferMode: 'batch'
} => {
  const completeListeners = new Set<ChatSegmentEventsMap<AiMsg>['complete']>()

  const segmentId = uid()

  const segment: ChatSegment<AiMsg> = {
    uid: segmentId,
    status: 'complete',
    items: []
  }

  triggerAsyncCallback(() => {
    completeListeners.forEach(listener => {
      listener(segment)
    })

    completeListeners.clear()
  })

  return {
    segment,
    observable: {
      on: (event, callback) => {
        if (event === 'complete') {
          completeListeners.add(
            callback as unknown as ChatSegmentCompleteCallback<AiMsg>
          )
        }
      },
      removeListener: (_, callback) => {
        completeListeners.delete(
          callback as unknown as ChatSegmentCompleteCallback<AiMsg>
        )
      },
      destroy: () => {
        completeListeners.clear()
      },
      get segmentId(): string {
        return segmentId
      }
    },
    dataTransferMode: 'batch'
  }
}
