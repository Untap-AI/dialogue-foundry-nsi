import { useRef } from 'react'

/**
 * AiChat API methods.
 */
export type AiChatApi = {
  /**
   * API methods related to sending messages.
   */
  composer: {
    /**
     * Types the message in the composer and sends it to the chat adapter automatically.
     *
     * @param {string} prompt
     */
    send: (prompt: string) => void

    /**
     * Cancel the request being sent.
     * If a message is being sent, it will be cancelled.
     * If a message is being generated (in streaming mode), the generation will stop and the message will deleted.
     * If no message is being sent, this method does nothing.
     */
    cancel: () => void
  }
  /**
   * API methods related to the conversation.
   */
  conversation: {
    /**
     * Reset the conversation.
     */
    reset: () => void
  }
}

export type AiChatInternalApi = AiChatApi & {
  __setHost: (host: AiChatHost) => void
  __unsetHost: () => void
}

type AiChatHost = {
  sendMessage: (prompt: string) => void
  resetConversation: () => void
  cancelLastMessageRequest: () => void
}

const createVoidInternalApi = (
  setHost: (host: AiChatHost) => void = () => {}
): AiChatInternalApi => {
  return {
    composer: {
      send: () => {
        throw new Error(
          'AiChatApi is not connected to a host <AiChat /> component.'
        )
      },
      cancel: () => {
        throw new Error(
          'AiChatApi is not connected to a host <AiChat /> component.'
        )
      }
    },

    conversation: {
      reset: () => {
        throw new Error(
          'AiChatApi is not connected to a host <AiChat /> component.'
        )
      }
    },

    // @ts-ignore
    __setHost: (host: AiChatApiHost) => {
      setHost(host)
    },

    // @ts-ignore
    __unsetHost: () => {
      // Do nothing
    }
  }
}