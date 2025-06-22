import { uid } from '../../../utils/uid'
import { triggerAsyncCallback } from './triggerAsyncCallback'
import type { ChatSegment } from '../../../types/chatSegment/chatSegment'
import type {
  ChatSegmentErrorCallback,
  ChatSegmentEventsMap
} from '../../../types/chatSegment/chatSegmentEvents'
import type { ChatSegmentObservable } from '../../../types/chatSegment/chatSegmentObservable'
import type { NLErrorId } from '../../../types/exceptions/errors'

export const createEmptyErrorSegment = <AiMsg>(
  errorId: NLErrorId
): {
  segment: ChatSegment<AiMsg>
  dataTransferMode: 'stream'
  observable: ChatSegmentObservable<AiMsg>
} => {
  const errorListeners = new Set<ChatSegmentEventsMap<AiMsg>['error']>()

  const segmentId = uid()

  const segment: ChatSegment<AiMsg> = {
    uid: segmentId,
    status: 'error',
    items: []
  }

  triggerAsyncCallback(() => {
    errorListeners.forEach(listener => listener(errorId))
    errorListeners.clear()
  })

  return {
    segment,
    dataTransferMode: 'stream',
    observable: {
      on: (event, callback) => {
        if (event === 'error') {
          errorListeners.add(callback as unknown as ChatSegmentErrorCallback)
        }
      },
      removeListener: (_, callback) => {
        errorListeners.delete(callback as unknown as ChatSegmentErrorCallback)
      },
      destroy: () => {
        errorListeners.clear()
      },
      get segmentId(): string {
        return segmentId
      }
    }
  }
}
