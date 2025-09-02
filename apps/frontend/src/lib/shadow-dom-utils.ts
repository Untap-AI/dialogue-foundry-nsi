/**
 * CSS normalizer for Shadow DOM
 * Fixes Tailwind CSS to work properly in Shadow DOM
 */
export function normalizeTailwindForShadowDOM(css: string): string {
  return css
    .replace(/:root\b/g, ':host')
    .replaceAll('((-webkit-hyphens:none)) and ', '')
    .replaceAll('(-webkit-hyphens: none) and ', '')
    .replaceAll('((-webkit-hyphens: none) and (not (margin-trim: inline)))', '(not (margin-trim: inline))')
}
