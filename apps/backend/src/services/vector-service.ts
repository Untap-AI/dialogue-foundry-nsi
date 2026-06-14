import { retrieveDocuments as upstashRetrieveDocuments } from './upstash-service'

type RetrievedDocument = {
  text: string
  url?: string | undefined
}

const extractFCodes = (query: string): string[] => {
  const fCodeRegex = /f\d{5,7}/gi
  const matches = query.match(fCodeRegex)
  if (!matches) return []
  return [...new Set(matches.map(code => code.toLowerCase()))]
}

const buildUpstashFilter = (fCodes: string[]): string | undefined => {
  if (fCodes.length === 0) return undefined
  if (fCodes.length === 1) return `f_code = '${fCodes[0]}'`
  return `(${fCodes.map(code => `f_code = '${code}'`).join(' OR ')})`
}

export const retrieveDocuments = async (
  namespace: string,
  query: string,
  topK: number = 10,
): Promise<RetrievedDocument[]> => {
  const fCodes = extractFCodes(query)
  return upstashRetrieveDocuments(namespace, query, topK, buildUpstashFilter(fCodes))
}

/**
 * Formats retrieved documents as context for the LLM.
 * @param documents The retrieved documents
 * @returns Formatted context string to append to the LLM prompt
 */
export const formatDocumentsAsContext = (documents: RetrievedDocument[]) => {
  if (!documents.length) return ''

  const contextParts = documents.map((doc, index) => {
    return `
    [Document ${index + 1}]

    ${doc.text}`
  })

  return `Relevant information from the knowledge base. Use the following information only to answer the user's question::

  ${contextParts.join('\n\n')}`
}
