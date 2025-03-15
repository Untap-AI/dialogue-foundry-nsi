import { IconPencil } from '@tabler/icons-react'
import { useState, type FC } from 'react'
import { cn } from '@/lib/utils'
import { MessageActions } from './message-actions'
import type { Tables } from '@/supabase/types'

const ICON_SIZE = 32

interface MessageProps {
  message: Tables<'messages'>
}

export const Message: FC<MessageProps> = ({ message }) => {
  const [isHovering, setIsHovering] = useState(false)

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content)
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = message.content
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }

  return (
    <div
      className={cn(
        'flex w-full justify-center',
        message.role === 'user' ? '' : 'bg-secondary'
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative flex w-full flex-col p-6 sm:w-[550px] sm:px-0 md:w-[650px] lg:w-[650px] xl:w-[700px]">
        <div className="absolute right-5 top-7 sm:right-0">
          <MessageActions onCopy={handleCopy} isHovering={isHovering} />
        </div>
        <div className="space-y-3">
          {message.role === 'system' ? (
            <div className="flex items-center space-x-4">
              <IconPencil
                className="border-primary bg-primary text-secondary rounded border-DEFAULT p-1"
                size={ICON_SIZE}
              />

              <div className="text-lg font-semibold">Prompt</div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* TODO: Add assistant name and maybe image here */}

              <div className="font-semibold">Assistant Name</div>
            </div>
          )}
          {/* TODO: I think we can remove this */}
          {/* {!firstTokenReceived &&
          isGenerating &&
          isLast &&
          message.role === "assistant" ? (
            <>
              {(() => {
                switch (toolInUse) {
                  case "none":
                    return (
                      <IconCircleFilled className="animate-pulse" size={20} />
                    )
                  case "retrieval":
                    return (
                      <div className="flex animate-pulse items-center space-x-2">
                        <IconFileText size={20} />

                        <div>Searching files...</div>
                      </div>
                    )
                  default:
                    return (
                      <div className="flex animate-pulse items-center space-x-2">
                        <IconBolt size={20} />

                        <div>Using {toolInUse}...</div>
                      </div>
                    )
                }
              })()}
            </>
          ) : isEditing ? (
            <TextareaAutosize
              textareaRef={editInputRef}
              className="text-md"
              value={editedMessage}
              onValueChange={setEditedMessage}
              maxRows={20}
            />
          ) : (
            <MessageMarkdown content={message.content} />
          )}
        </div> */}
        </div>
      </div>
    </div>
  )
}
