/**
 * TextRenderer
 * returns only the textual part of the token
 */
export class _TextRenderer {
  br() {
    return ''
  }

  codespan(text: string) {
    return text
  }

  del(text: string) {
    return text
  }

  em(text: string) {
    return text
  }

  html(text: string) {
    return text
  }

  image(__: string, _: string | null, text: string) {
    return `${text}`
  }

  link(__: string, _: string | null | undefined, text: string) {
    return `${text}`
  }

  // no need for block level renderers
  strong(text: string) {
    return text
  }

  text(text: string) {
    return text
  }
}
