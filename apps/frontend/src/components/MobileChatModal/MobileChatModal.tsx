import { useRef, useEffect } from 'react'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import type { ChatItem } from '../../nlux'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import { useRouteChangeListener } from '../../hooks/useRouteChangeListener'
import { cn } from '@/lib/utils'

interface MobileChatModalProps {
  isOpen: boolean
  onClose: () => void
  onNewChat: () => void
  chatId: string | undefined
  initialConversation: ChatItem[] | undefined
  chatStatus: ChatStatus
}

export const MobileChatModal = ({
  isOpen,
  onClose,
  onNewChat,
  ...propDrop
}: MobileChatModalProps) => {
  // eslint-disable-next-line no-null/no-null
  const dialogRef = useRef<HTMLDialogElement>(null)

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
        "w-screen max-w-screen h-screen max-h-screen m-0 p-0 border-none",
        "z-[10000] overflow-hidden backdrop:bg-black/50"
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
        "w-full h-screen flex flex-col overflow-hidden relative"
      )}>
        <ChatHeader onClose={onClose} onNewChat={onNewChat} />
        <ChatInterface />
      </div>
    </dialog>
  )
}
