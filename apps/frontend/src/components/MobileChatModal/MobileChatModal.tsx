import { useRef, useEffect } from 'react'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import { ChatHeader } from '../ChatHeader/ChatHeader'
import './MobileChatModal.css'
import type { ChatItem } from '../../nlux'
import type { ChatStatus } from '../ChatWidget/ChatWidget'
import { useRouteChangeListener } from '../../hooks/useRouteChangeListener'

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
      className="mobile-chat-modal"
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
      <div className="mobile-chat-content">
        <ChatHeader onClose={onClose} onNewChat={onNewChat} />
        <ChatInterface
          className="mobile-chat-interface mobile-chat-bubbles"
          {...propDrop}
        />
      </div>
    </dialog>
  )
}
