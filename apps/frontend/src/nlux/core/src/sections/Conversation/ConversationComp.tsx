import { createRef, forwardRef, useImperativeHandle, useMemo } from 'react'
import { ChatSegmentComp } from '../ChatSegment/ChatSegmentComp'
import { useChatSegmentsController } from './hooks/useChatSegmentsController'
import { useLastActiveSegment } from './hooks/useLastActiveSegment'
import type { ChatSegmentImperativeProps } from '../ChatSegment/props'
import type { ReactNode, Ref, RefObject } from 'react'
import type {
  ConversationCompProps,
  ImperativeConversationCompProps
} from './props'

type ConversationCompType = <AiMsg>(
  props: ConversationCompProps<AiMsg>,
  ref: Ref<ImperativeConversationCompProps<AiMsg>>
) => ReactNode

export const ConversationComp: ConversationCompType = function <AiMsg>(
  props: ConversationCompProps<AiMsg>,
  ref: Ref<ImperativeConversationCompProps<AiMsg>>
): ReactNode {
  const { segments, personaOptions, onLastActiveSegmentChange } = props

  const lastSegmentContainerRef = createRef<HTMLDivElement>()
  useLastActiveSegment<AiMsg>(
    segments,
    lastSegmentContainerRef as RefObject<HTMLDivElement>,
    onLastActiveSegmentChange
  )

  const segmentsController = useChatSegmentsController<AiMsg>(segments)

  useImperativeHandle(
    ref,
    () => ({
      streamChunk: (segmentId: string, messageId: string, chunk: AiMsg) => {
        const chatSegment = segmentsController.get(segmentId)
        chatSegment?.streamChunk(messageId, chunk)
      },
      completeStream: (segmentId: string, messageId: string) => {
        const chatSegment = segmentsController.get(segmentId)
        chatSegment?.completeStream(messageId)
      },
      cancelSegmentStreams: (segmentId: string) => {
        const chatSegment = segmentsController.get(segmentId)
        chatSegment?.cancelStreams()
      }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const ForwardRefChatSegmentComp = useMemo(
    () => forwardRef(ChatSegmentComp<AiMsg>),
    []
  )

  console.log(props.events)

  return (
    <div className="nlux-chatSegments-container">
      {segments.map((segment, index) => {
        const isLastSegment = index === segments.length - 1
        const isInitialSegment = segment.uid === 'initial'

        let newRef = segmentsController.getRef(segment.uid) as
          | RefObject<ChatSegmentImperativeProps<AiMsg>>
          | undefined
        if (!newRef) {
          newRef = createRef() as unknown as RefObject<
            ChatSegmentImperativeProps<AiMsg>
          >
          segmentsController.set(segment.uid, newRef)
        }

        return (
          <ForwardRefChatSegmentComp
            ref={newRef}
            key={segment.uid}
            containerRef={
              isLastSegment
                ? (lastSegmentContainerRef as RefObject<HTMLDivElement>)
                : undefined
            }
            markdownContainersController={props.markdownContainersController}
            chatSegment={segment}
            isInitialSegment={isInitialSegment}
            layout="bubbles"
            personaOptions={personaOptions}
            messageOptions={props.messageOptions}
            submitShortcutKey={props.submitShortcutKey}
            onPromptResubmit={props.onPromptResubmit}
            onMarkdownStreamRendered={props.onMarkdownStreamRendered}
            events={props.events}
          />
        )
      })}
    </div>
  )
}
