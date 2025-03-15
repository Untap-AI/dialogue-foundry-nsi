import { useContext } from 'react'
import { ChatbotUIContext } from '@/context/context'
import { Message } from '../messages/message'
import type { FC } from 'react'

interface ChatMessagesProps {}

export const ChatMessages: FC<ChatMessagesProps> = () => {
  const { chatMessages } = useContext(ChatbotUIContext)

  return chatMessages
    .toSorted((a, b) => a.message.sequence_number - b.message.sequence_number)
    .map(chatMessage => {
      return (
        <Message
          key={chatMessage.message.sequence_number}
          message={chatMessage.message}
        />
      )
    })
}
