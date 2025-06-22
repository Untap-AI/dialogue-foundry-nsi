import { useMemo } from 'react'
import type { StreamSend } from '../../../../shared/types/adapters/chat/chatAdapter'
import type { DependencyList } from 'react'
import type { ChatAdapter } from '../../types/chatAdapter'

/**
 * Use the function provided as a stream adapter to send messages and receive responses in a stream of chunks.
 *
 * @param submit
 * @param dependencies
 */
export const useAsStreamAdapter = function <AiMsg = string>(
  submit: StreamSend<AiMsg>,
  dependencies?: DependencyList
): ChatAdapter<AiMsg> {
  return useMemo(
    () => ({ streamText: submit }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies ?? [{}] // If no dependencies are provided, we use an empty object to force the hook
    // to run every time (no memoization).
  )
}
