type Highlighter = (input: string, language: string) => string

type HighlighterColorMode = 'dark' | 'light'

type CreateHighlighterOptions = {
  language?: string
  colorMode?: HighlighterColorMode
}

export interface HighlighterExtension {
  createHighlighter(options?: CreateHighlighterOptions): Highlighter

  highlightingClass(language?: string): string
}
