import { useState } from 'react'

interface ChatHeaderProps {
  title: string
  logoUrl?: string
  onClose: () => void
  onMinimize: () => void
}

const ChatHeader = ({
  title,
  logoUrl,
  onClose,
  onMinimize
}: ChatHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleNewChat = () => {
    // Handle new chat functionality
    setIsMenuOpen(false)
    // Additional logic for new chat would go here
  }

  const handleEndChat = () => {
    setIsMenuOpen(false)
    onClose()
  }

  return (
    <div className="flex items-center justify-between px-[15px] py-[15px] bg-[#333] text-white">
      {/* Branding section */}
      <div className="flex items-center justify-center flex-grow">
        {logoUrl && (
          <img src={logoUrl} alt="Brand Logo" className="h-[30px] mr-[10px]" />
        )}
        <div className="font-bold text-[16px]">{title}</div>
      </div>

      {/* Controls */}
      <div className="flex gap-[15px]">
        <span
          className="cursor-pointer text-[#ccc] hover:text-white"
          onClick={toggleMenu}
        >
          ⋮
        </span>
        <span
          className="cursor-pointer text-[#ccc] hover:text-white"
          onClick={onMinimize}
        >
          —
        </span>
      </div>

      {/* Menu dropdown */}
      {isMenuOpen && (
        <div className="absolute top-[50px] right-[15px] bg-[#333] rounded-[5px] shadow-lg z-10">
          <div
            className="px-[15px] py-[10px] text-[#eee] cursor-pointer text-[14px] transition-colors hover:bg-[#444] rounded-t-[5px]"
            onClick={handleNewChat}
          >
            New Chat
          </div>
          <div
            className="px-[15px] py-[10px] text-[#eee] cursor-pointer text-[14px] transition-colors hover:bg-[#444]"
            onClick={handleEndChat}
          >
            End Chat
          </div>
          <div className="px-[15px] py-[10px] text-[#eee] cursor-pointer text-[14px] transition-colors hover:bg-[#444] rounded-b-[5px]">
            Recent Chats
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatHeader
