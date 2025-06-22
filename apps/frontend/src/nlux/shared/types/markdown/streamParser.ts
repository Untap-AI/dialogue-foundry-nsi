import type { HighlighterExtension } from './highlighter'
import type { SanitizerExtension } from '../../sanitizer/sanitizer'

interface IObserver<DataType> {
  complete?(): void

  error?(error: Error): void

  next(value: DataType): void
}

export type StandardStreamParserOutput = {
  next(value: string): void
  complete(): void
  cancel(): void
  error(error: Error): void
}

export type StandardStreamParser = (
  root: HTMLElement,
  options?: {
    syntaxHighlighter?: HighlighterExtension
    htmlSanitizer?: SanitizerExtension
    markdownLinkTarget?: 'blank' | 'self'
    showCodeBlockCopyButton?: boolean
    skipStreamingAnimation?: boolean
    streamingAnimationSpeed?: number
    waitTimeBeforeStreamCompletion?: number | 'never'
    onComplete?: () => void
  }
) => StandardStreamParserOutput
