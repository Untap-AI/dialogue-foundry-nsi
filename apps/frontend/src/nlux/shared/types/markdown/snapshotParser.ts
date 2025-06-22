import type { HighlighterExtension } from './highlighter'
import type { SanitizerExtension } from '../../sanitizer/sanitizer'

export type SnapshotParserOptions = {
  syntaxHighlighter?: HighlighterExtension
  htmlSanitizer?: SanitizerExtension
  markdownLinkTarget?: 'blank' | 'self'
  showCodeBlockCopyButton?: boolean
  skipStreamingAnimation?: boolean
}

export type SnapshotParser = (
  snapshot: string,
  options?: SnapshotParserOptions
) => string
