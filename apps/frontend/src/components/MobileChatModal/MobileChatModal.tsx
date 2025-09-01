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
        "w-screen max-w-screen h-dvh max-h-dvh m-0 p-0 border-none",
        "z-[10000] overflow-hidden backdrop:bg-black/50",
        "fixed inset-0"
      )}
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
        "w-full h-full flex flex-col overflow-hidden relative"
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
