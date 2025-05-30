/**
 * This type represents the information that the AiChat needs to know about an adapter.
 * It is used to determine which adapters are available and what capabilities they have.
 */
export type StandardAdapterInfo = Readonly<{
  id: string
  capabilities: Readonly<{
    chat: boolean
    fileUpload: boolean
    textToSpeech: boolean
    speechToText: boolean
  }>
}>
