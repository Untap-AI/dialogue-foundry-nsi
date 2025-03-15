import { IconCheck, IconCopy } from '@tabler/icons-react'
import { Fragment, useContext, useEffect, useState } from 'react'
import { ChatbotUIContext } from '@/context/context'
import { WithTooltip } from '../ui/with-tooltip'
import type { FC } from 'react'

export const MESSAGE_ICON_SIZE = 18

interface MessageActionsProps {
  isHovering: boolean
  onCopy: () => void
}

export const MessageActions: FC<MessageActionsProps> = ({
  isHovering,
  onCopy
}) => {
  const { isGenerating } = useContext(ChatbotUIContext)

  const [showCheckmark, setShowCheckmark] = useState(false)

  const handleCopy = () => {
    onCopy()
    setShowCheckmark(true)
  }

  useEffect(() => {
    if (showCheckmark) {
      const timer = setTimeout(() => {
        setShowCheckmark(false)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [showCheckmark])

  return isGenerating ? (
    <Fragment />
  ) : (
    <div className="text-muted-foreground flex items-center space-x-2">
      {isHovering && (
        <WithTooltip
          delayDuration={1000}
          side="bottom"
          display={<div>Copy</div>}
          trigger={
            showCheckmark ? (
              <IconCheck size={MESSAGE_ICON_SIZE} />
            ) : (
              <IconCopy
                className="cursor-pointer hover:opacity-50"
                size={MESSAGE_ICON_SIZE}
                onClick={handleCopy}
              />
            )
          }
        />
      )}
    </div>
  )
}
