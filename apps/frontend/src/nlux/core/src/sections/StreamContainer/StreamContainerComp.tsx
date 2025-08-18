import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { className as compMessageClassName } from '../../../../shared/components/Message/create'
import { directionClassName as compMessageDirectionClassName } from '../../../../shared/components/Message/utils/applyNewDirectionClassName'
import { statusClassName as compMessageStatusClassName } from '../../../../shared/components/Message/utils/applyNewStatusClassName'
import { createMdStreamRenderer } from '../../../../shared/markdown/stream/streamParser'
import type { ResponseRenderer } from '../../exports/messageOptions'
import type { Ref, RefObject } from 'react'
import type { StandardStreamParserOutput } from '../../../../shared/types/markdown/streamParser'
import type {
  StreamContainerImperativeProps,
  StreamContainerProps
} from './props'

export const StreamContainerComp = function <AiMsg>(
  props: StreamContainerProps<AiMsg>,
  ref: Ref<StreamContainerImperativeProps<AiMsg>>
) {
  const {
    uid,
    status,
    responseRenderer,
    markdownOptions,
    initialMarkdownMessage,
    markdownContainersController
  } = props

  const [content, setContent] = useState<Array<AiMsg>>([])

  // We use references in this component to avoid re-renders — as streaming happens outside of React
  // rendering cycle, we don't want to trigger re-renders on every chunk of data received.
  const rootElRef = useRef<HTMLDivElement | null>(null)
  const rootElRefPreviousValue = useRef<HTMLDivElement | null>(null)
  const mdStreamParserRef = useRef<StandardStreamParserOutput | null>(null)
  const appendChunkToStateRef = useRef<((newContent: AiMsg) => void) | null>(
    null
  )
  const [streamContainer, setStreamContainer] = useState<HTMLDivElement>()
  
  // Helper function to initialize the markdown parser
  const initializeParser = () => {
    if (!mdStreamParserRef.current) {
      const element = markdownContainersController.getStreamingDomElement(uid)
      mdStreamParserRef.current = createMdStreamRenderer(element, {
        syntaxHighlighter: markdownOptions?.syntaxHighlighter,
        htmlSanitizer: markdownOptions?.htmlSanitizer,
        markdownLinkTarget: markdownOptions?.markdownLinkTarget,
        showCodeBlockCopyButton: markdownOptions?.showCodeBlockCopyButton,
        skipStreamingAnimation: markdownOptions?.skipStreamingAnimation,
        streamingAnimationSpeed: markdownOptions?.streamingAnimationSpeed,
        waitTimeBeforeStreamCompletion:
          markdownOptions?.waitTimeBeforeStreamCompletion,
        onComplete: markdownOptions?.onStreamComplete
      })

      if (initialMarkdownMessage) {
        mdStreamParserRef.current.next(initialMarkdownMessage)
      }
    }
  }

  useEffect(() => {
    if (rootElRef.current !== rootElRefPreviousValue.current) {
      rootElRefPreviousValue.current = rootElRef.current
      setStreamContainer(rootElRef.current || undefined)
    }
  }) // No dependencies, this effect should run on every render.
  // The 'if' statement inside the effect plays a similar role to a useEffect dependency array
  // to prevent setting the streamContainer state to the same value multiple times.

  useEffect(() => {
    if (streamContainer) {
      const element = markdownContainersController.getStreamingDomElement(uid)
      streamContainer.append(element)
    }
  }, [streamContainer])

  useEffect(() => {
    appendChunkToStateRef.current = (newContent: AiMsg) => {
      setContent(prevContent => [...prevContent, newContent])
    }
  }, [setContent])

  // Initialize parser in useLayoutEffect (runs before paint)
  useLayoutEffect(() => {
    initializeParser()
    return () => {
      markdownContainersController.deleteStreamingDomElement(uid)
    }
  }, []) // No dependencies - run once on mount

  useEffect(() => {
    return () => {
      rootElRefPreviousValue.current = null
      mdStreamParserRef.current = null
      appendChunkToStateRef.current = null
      setStreamContainer(undefined)
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      streamChunk: (chunk: AiMsg) => {
        console.log(`[STREAM-CONTAINER] streamChunk called: "${chunk}"`)
        
        // This will append the chunk to the state
        const appendChunkToState = appendChunkToStateRef.current
        if (appendChunkToState) {
          appendChunkToStateRef.current?.(chunk)
        }

        if (typeof chunk === 'string') {
          // Ensure parser is initialized before processing chunk (safety check)
          if (!mdStreamParserRef.current) {
            initializeParser()
          }
          mdStreamParserRef.current?.next(chunk)
        }
      },
      completeStream: () => {
        mdStreamParserRef.current?.complete()
      },
      cancelStream: () => {
        mdStreamParserRef.current?.cancel()
      }
    }),
    []
  )

  const compDirectionClassName = compMessageDirectionClassName['received']
  const compStatusClassName = compMessageStatusClassName[status]
  const className = `${compMessageClassName} ${compStatusClassName} ${compDirectionClassName}`
  const StreamResponseRendererComp = responseRenderer
    ? (responseRenderer as ResponseRenderer<AiMsg>)
    : undefined

  return (
    <div className={className}>
      {StreamResponseRendererComp && (
        <StreamResponseRendererComp
          uid={uid}
          status={status}
          containerRef={rootElRef as RefObject<never>}
          content={content}
          contentType={'text'}
          serverResponse={[]}
          dataTransferMode={'stream'}
        />
      )}
      {!StreamResponseRendererComp && (
        <div className={'nlux-markdownStream-root'} ref={rootElRef} />
      )}
    </div>
  )
}
