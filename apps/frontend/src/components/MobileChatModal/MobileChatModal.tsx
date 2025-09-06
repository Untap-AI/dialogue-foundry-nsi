import { useRef, useEffect } from 'react'
import { ChatInterface, type ChatInterfaceRef } from '../ChatInterface/ChatInterface'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import type { ChatStatus } from '../../hooks/useChatPersistence'
import { useRouteChangeListener } from '../../hooks/useRouteChangeListener'
import { cn } from '@/lib/utils'

interface MobileChatModalProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  onChatStatusChange?: (status: ChatStatus) => void
}

export const MobileChatModal = ({
  isOpen,
  onClose,
  onNewChat,
  onChatStatusChange
}: MobileChatModalProps) => {
  // eslint-disable-next-line no-null/no-null
  const dialogRef = useRef<HTMLDialogElement>(null)
  const chatInterfaceRef = useRef<ChatInterfaceRef>(null)

  // Handle new chat creation from header
  const handleNewChat = async () => {
    await chatInterfaceRef.current?.createNewChat()
    onNewChat()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      // Show the dialog as a modal
      dialog.showModal()

      document.body.style.overflow = 'hidden'
    } else {
      // Close the dialog

      document.body.style.overflow = ''
      dialog.close()
    }
  }, [isOpen])

  useRouteChangeListener(onClose)

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "df:w-screen df:max-w-screen df:h-dvh df:max-h-dvh df:m-0 df:p-0 df:border-none",
        "df:z-[10000] df:overflow-hidden backdrop:df:bg-black/50",
        "df:fixed df:inset-0"
      )}
      data-dialogue-foundry-id="mobile-chat-modal"
      onCancel={e => {
        e.preventDefault() // Prevent default close on ESC key
      }}
      onClick={e => {
        // Close if clicking on the backdrop (the dialog element itself)
        if (e.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className={cn(
        "df:w-full df:h-full df:flex df:flex-col df:overflow-hidden df:relative df:bg-background df:text-foreground"
      )}>
        <ChatHeader onClose={onClose} onNewChat={handleNewChat} />
        <ChatInterface 
          ref={chatInterfaceRef}
          onNewChatRequest={onNewChat}
          onChatStatusChange={onChatStatusChange}
        />
      </div>
    </dialog>
  )
}
