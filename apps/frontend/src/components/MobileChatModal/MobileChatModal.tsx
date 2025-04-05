import { useRef, useEffect } from 'react'
import { ChatInterface } from '../ChatInterface/ChatInterface'
import ChatHeader from '../ChatHeader/ChatHeader'
import './MobileChatModal.css'
import useChatScroll from '../../hooks/useChatScroll'

interface MobileChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileChatModal = ({ isOpen, onClose }: MobileChatModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const {scrollToBottom} = useChatScroll({isOpen})

  
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      // Show the dialog as a modal
      dialog.showModal()

      document.body.style.overflow = 'hidden'
      
      // Initial scroll to bottom after modal opens
      // Use a longer timeout to ensure all content is rendered
      setTimeout(() => {
        scrollToBottom()
      }, 300)
    } else {
      // Close the dialog

      document.body.style.overflow = ''
      dialog.close()
    }
  }, [isOpen, scrollToBottom])

  return (
    <dialog
      ref={dialogRef}
      className="mobile-chat-modal"
      onCancel={(e) => {
        e.preventDefault() // Prevent default close on ESC key
      }}
      onClick={(e) => {
        // Close if clicking on the backdrop (the dialog element itself)
        if (e.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="mobile-chat-content">
        <ChatHeader onClose={onClose} />
        <ChatInterface 
          className="mobile-chat-interface mobile-chat-bubbles"
        />
      </div>
    </dialog>
  )
}

export default MobileChatModal